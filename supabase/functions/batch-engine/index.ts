// =============================================================================
// DelivriLi — Supabase Edge Function: batch-engine
// File: supabase/functions/batch-engine/index.ts
// Runtime: Deno (Supabase Edge Functions)
//
// Trigger: HTTP POST from a Supabase Database Webhook on public.orders
//   - Filter: NEW.status = 'preparing'
//
// Flow:
//   1. Parse the triggering order payload
//   2. Find the nearest available courier via PostGIS
//   3. Run ST_DWithin to find candidate orders within 1.5 km
//   4. Build a coordinate matrix; call OSRM /table for time matrix
//   5. Apply 6-minute detour threshold filter per candidate order
//   6. Call OSRM /trip to solve TSP and get optimal sequence
//   7. Persist order_batch + batch_stops with sequence & ETAs
// =============================================================================

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.1";

// ── Environment Variables (set in Supabase Dashboard > Edge Functions > Secrets)
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OSRM_BASE_URL        = Deno.env.get("OSRM_BASE_URL")!; // e.g. http://osrm.yourdomain.com
const DETOUR_THRESHOLD_S   = 360;  // 6 minutes hard cap
const PROXIMITY_RADIUS_M   = 1500; // 1.5 km

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderPayload {
  id: string;
  restaurant_id: string;
  status: string;
  customer_name: string;
  delivery_address: string | null;
  pickup_location: GeoJsonPoint | null;
  dropoff_location: GeoJsonPoint | null;
}

interface GeoJsonPoint {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}

interface NearbyOrder {
  order_id: string;
  restaurant_id: string;
  pickup_lng: number;
  pickup_lat: number;
  dropoff_lng: number;
  dropoff_lat: number;
  distance_m: number;
}

interface Courier {
  id: string;
  display_name: string;
  current_location: GeoJsonPoint;
}

interface OsrmTableResponse {
  code: string;
  durations: number[][];  // NxN matrix of travel durations in seconds
  sources: OsrmWaypoint[];
  destinations: OsrmWaypoint[];
}

interface OsrmTripResponse {
  code: string;
  trips: OsrmTrip[];
  waypoints: OsrmTripWaypoint[];
}

interface OsrmTrip {
  distance: number;  // metres
  duration: number;  // seconds
  geometry: string | object; // encoded polyline or GeoJSON
  legs: OsrmLeg[];
}

interface OsrmLeg {
  distance: number;
  duration: number;
  summary: string;
}

interface OsrmWaypoint {
  location: [number, number]; // [lng, lat]
  name: string;
}

interface OsrmTripWaypoint extends OsrmWaypoint {
  waypoint_index: number;
  trips_index: number;
}

// ── Coordinate helpers ────────────────────────────────────────────────────────

/** Formats [lng, lat] pair as `lng,lat` string for OSRM URLs */
function coord(lng: number, lat: number): string {
  return `${lng},${lat}`;
}

/** Converts PostGIS geography JSON (GeoJSON) to [lng, lat] */
function extractCoords(geo: GeoJsonPoint | null): [number, number] | null {
  if (!geo || !geo.coordinates) return null;
  return [geo.coordinates[0], geo.coordinates[1]];
}

// ── OSRM API Calls ────────────────────────────────────────────────────────────

/**
 * Calls OSRM /table/v1/driving to get an NxN travel-time duration matrix.
 * @param coords  Array of [lng, lat] coordinate pairs
 * @returns       NxN matrix (seconds), or null on OSRM error
 */
async function fetchOsrmTable(
  coords: [number, number][]
): Promise<OsrmTableResponse | null> {
  const coordStr = coords.map(([lng, lat]) => coord(lng, lat)).join(";");
  const url = `${OSRM_BASE_URL}/table/v1/driving/${coordStr}?annotations=duration`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`OSRM /table error ${res.status}: ${await res.text()}`);
    return null;
  }
  const data = await res.json() as OsrmTableResponse;
  if (data.code !== "Ok") {
    console.error("OSRM /table non-Ok code:", data.code);
    return null;
  }
  return data;
}

/**
 * Calls OSRM /trip/v1/driving to solve the TSP for a set of waypoints.
 * source=first   — fixes the courier as the starting point.
 * destination=last — fixes the last dropoff as the end point.
 * roundtrip=false — prevents returning to origin.
 * geometries=geojson — returns a GeoJSON LineString for the route.
 */
async function fetchOsrmTrip(
  coords: [number, number][]
): Promise<OsrmTripResponse | null> {
  const coordStr = coords.map(([lng, lat]) => coord(lng, lat)).join(";");
  const url =
    `${OSRM_BASE_URL}/trip/v1/driving/${coordStr}` +
    `?source=first&destination=last&roundtrip=false&geometries=geojson&overview=full&steps=false`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`OSRM /trip error ${res.status}: ${await res.text()}`);
    return null;
  }
  const data = await res.json() as OsrmTripResponse;
  if (data.code !== "Ok") {
    console.error("OSRM /trip non-Ok code:", data.code);
    return null;
  }
  return data;
}

// ── Core Batching Logic ───────────────────────────────────────────────────────

/**
 * Calculates the "baseline" single-order delivery duration:
 * courier → pickup → dropoff (no batching).
 *
 * Uses rows from the OSRM duration matrix:
 *   matrix[courierIdx][pickupIdx]    = courier to pickup
 *   matrix[pickupIdx][dropoffIdx]    = pickup to dropoff
 */
function baselineDuration(
  matrix: number[][],
  courierIdx: number,
  pickupIdx: number,
  dropoffIdx: number
): number {
  return matrix[courierIdx][pickupIdx] + matrix[pickupIdx][dropoffIdx];
}

/**
 * For each candidate order, calculate the extra detour it would add to the
 * triggering order's delivery time.
 *
 * Conservative upper-bound check:
 *   detour = (courier→trigPickup→candPickup→trigDropoff→candDropoff) - baseline
 *
 * The candidate is accepted only if detour <= DETOUR_THRESHOLD_S.
 */
function filterByDetour(
  candidates: NearbyOrder[],
  matrix: number[][],
  courierIdx: number,
  triggerPickupIdx: number,
  triggerDropoffIdx: number,
  candidateStartIdx: number // index in matrix where candidate pickups start
): { accepted: NearbyOrder[]; maxDetour: number } {
  const baseline = baselineDuration(
    matrix,
    courierIdx,
    triggerPickupIdx,
    triggerDropoffIdx
  );

  const accepted: NearbyOrder[] = [];
  let maxDetour = 0;

  candidates.forEach((candidate, i) => {
    const cPickupIdx  = candidateStartIdx + i * 2;
    const cDropoffIdx = candidateStartIdx + i * 2 + 1;

    // Conservative worst-case additional time through the candidate stops
    const withDetour =
      matrix[courierIdx][triggerPickupIdx] +
      matrix[triggerPickupIdx][cPickupIdx] +
      matrix[cPickupIdx][triggerDropoffIdx] +
      matrix[triggerDropoffIdx][cDropoffIdx];

    const detour = withDetour - baseline;

    console.log(
      `[detour-check] order=${candidate.order_id} ` +
      `baseline=${baseline}s withDetour=${withDetour}s detour=${detour}s`
    );

    if (detour <= DETOUR_THRESHOLD_S) {
      accepted.push(candidate);
      maxDetour = Math.max(maxDetour, detour);
    } else {
      console.warn(
        `[detour-reject] order=${candidate.order_id} detour=${detour}s > threshold=${DETOUR_THRESHOLD_S}s`
      );
    }
  });

  return { accepted, maxDetour };
}

// ── Edge Function Entry Point ─────────────────────────────────────────────────

serve(async (req: Request) => {
  // ── 0. Auth guard: only accept calls from Supabase Webhooks (service role)
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── 1. Parse the database webhook payload
  let body: { record: OrderPayload; type: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { record: order, type: eventType } = body;

  // Only process INSERT or UPDATE events where status = 'preparing'
  if (!["INSERT", "UPDATE"].includes(eventType) || order.status !== "preparing") {
    return new Response(
      JSON.stringify({ skipped: true, reason: "Not a preparing order event" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Validate that the order has the required geospatial data
  const pickupCoords  = extractCoords(order.pickup_location);
  const dropoffCoords = extractCoords(order.dropoff_location);

  if (!pickupCoords || !dropoffCoords) {
    console.warn(`[batch-engine] Order ${order.id} has no geo coordinates — skipping.`);
    return new Response(
      JSON.stringify({ skipped: true, reason: "Missing geo coordinates" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── 2. Initialise Supabase admin client (service role bypasses RLS)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  console.log(`[batch-engine] Processing order ${order.id} status=preparing`);

  // ── 3. Find nearest available courier via PostGIS spatial ordering
  const { data: couriers, error: courierErr } = await supabase
    .from("couriers")
    .select("id, display_name, current_location")
    .eq("is_active", true)
    .eq("is_available", true)
    .order(
      `current_location <-> ST_SetSRID(ST_MakePoint(${pickupCoords[0]}, ${pickupCoords[1]}), 4326)::geography`
    )
    .limit(1);

  if (courierErr || !couriers || couriers.length === 0) {
    console.warn(`[batch-engine] No available courier found. Parking order ${order.id}.`);
    return new Response(
      JSON.stringify({ queued: true, reason: "No available courier" }),
      { status: 202, headers: { "Content-Type": "application/json" } }
    );
  }

  const courier       = couriers[0] as Courier;
  const courierCoords = extractCoords(courier.current_location);

  if (!courierCoords) {
    return new Response(
      JSON.stringify({ error: "Courier has no location" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  console.log(`[batch-engine] Assigned courier ${courier.id} (${courier.display_name})`);

  // ── 4. Spatial proximity query: find candidate orders within 1.5 km
  const { data: candidates, error: candidateErr } = await supabase.rpc(
    "get_nearby_preparing_orders",
    {
      p_lng:      pickupCoords[0],
      p_lat:      pickupCoords[1],
      p_radius_m: PROXIMITY_RADIUS_M,
    }
  );

  if (candidateErr) {
    console.error("[batch-engine] Candidate RPC error:", candidateErr);
    return new Response(JSON.stringify({ error: candidateErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Exclude the triggering order from candidates (it's always included)
  const otherCandidates = ((candidates as NearbyOrder[]) ?? []).filter(
    (c) => c.order_id !== order.id
  );

  console.log(
    `[batch-engine] Found ${otherCandidates.length} nearby candidate order(s) to evaluate.`
  );

  // ── 5. Build OSRM duration matrix
  // Coordinate layout:
  //   [0]              = Courier current location
  //   [1]              = Trigger order pickup
  //   [2]              = Trigger order dropoff
  //   [3, 4]           = Candidate 0 (pickup, dropoff)
  //   [5, 6]           = Candidate 1 (pickup, dropoff)
  //   ...

  const matrixCoords: [number, number][] = [
    courierCoords,  // idx 0
    pickupCoords,   // idx 1
    dropoffCoords,  // idx 2
    ...otherCandidates.flatMap((c) => [
      [c.pickup_lng,  c.pickup_lat]  as [number, number],
      [c.dropoff_lng, c.dropoff_lat] as [number, number],
    ]),
  ];

  let acceptedCandidates: NearbyOrder[] = [];
  let maxDetour = 0;

  if (otherCandidates.length > 0) {
    const tableResponse = await fetchOsrmTable(matrixCoords);

    if (!tableResponse) {
      console.warn("[batch-engine] OSRM /table failed; continuing solo.");
    } else {
      const result = filterByDetour(
        otherCandidates,
        tableResponse.durations,
        0, // courierIdx
        1, // triggerPickupIdx
        2, // triggerDropoffIdx
        3  // candidateStartIdx
      );
      acceptedCandidates = result.accepted;
      maxDetour          = result.maxDetour;
    }
  }

  console.log(
    `[batch-engine] ${acceptedCandidates.length} candidate(s) passed detour threshold.`
  );

  // ── 6. Build final waypoint list for OSRM /trip TSP solver
  // Layout: courier → [all pickups] → [all dropoffs]
  // OSRM /trip with source=first, destination=last will reorder the middle stops.

  type OrderEntry = {
    orderId: string;
    pickup: [number, number];
    dropoff: [number, number];
    label: string;
  };

  const allOrders: OrderEntry[] = [
    {
      orderId: order.id,
      pickup:  pickupCoords,
      dropoff: dropoffCoords,
      label:   order.customer_name,
    },
    ...acceptedCandidates.map((c) => ({
      orderId: c.order_id,
      pickup:  [c.pickup_lng, c.pickup_lat]   as [number, number],
      dropoff: [c.dropoff_lng, c.dropoff_lat] as [number, number],
      label:   `Order ${c.order_id.slice(0, 8)}`,
    })),
  ];

  // Trip waypoints: [courier, ...pickups, ...dropoffs]
  const tripCoords: [number, number][] = [
    courierCoords,
    ...allOrders.map((o) => o.pickup),
    ...allOrders.map((o) => o.dropoff),
  ];

  const tripResponse = await fetchOsrmTrip(tripCoords);

  if (!tripResponse || tripResponse.trips.length === 0) {
    console.error("[batch-engine] OSRM /trip failed; aborting batch creation.");
    return new Response(
      JSON.stringify({ error: "OSRM /trip failed" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  const trip      = tripResponse.trips[0];
  const waypoints = tripResponse.waypoints;

  console.log(
    `[batch-engine] OSRM /trip: distance=${trip.distance}m duration=${trip.duration}s`
  );

  // ── 7. Build stop sequence from OSRM waypoint_index ordering
  const sortedWaypoints = [...waypoints].sort(
    (a, b) => a.waypoint_index - b.waypoint_index
  );

  // Build cumulative ETA seconds per stop from trip legs
  const cumulativeEtas: number[] = [0];
  let cumulative = 0;
  for (const leg of trip.legs) {
    cumulative += leg.duration;
    cumulativeEtas.push(Math.round(cumulative));
  }

  // Build a lookup: input index → { orderIdx, stopType }
  const numOrders = allOrders.length;
  const inputIndexMeta: Record<number, { orderIdx: number; stopType: "PICKUP" | "DROPOFF" }> = {};
  for (let i = 0; i < numOrders; i++) {
    inputIndexMeta[1 + i]             = { orderIdx: i, stopType: "PICKUP" };
    inputIndexMeta[1 + numOrders + i] = { orderIdx: i, stopType: "DROPOFF" };
  }

  // ── 8. Persist: create order_batch record
  const batchStartTime = new Date();

  const { data: newBatch, error: batchErr } = await supabase
    .from("order_batches")
    .insert({
      courier_id:          courier.id,
      status:              "ASSIGNED",
      total_distance_m:    Math.round(trip.distance),
      total_duration_s:    Math.round(trip.duration),
      osrm_route_geometry: trip.geometry,
      max_detour_added_s:  Math.round(maxDetour),
      detour_threshold_s:  DETOUR_THRESHOLD_S,
    })
    .select("id")
    .single();

  if (batchErr || !newBatch) {
    console.error("[batch-engine] Failed to create order_batch:", batchErr);
    return new Response(
      JSON.stringify({ error: "Failed to create batch record" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const batchId = (newBatch as { id: string }).id;
  console.log(`[batch-engine] Created order_batch ${batchId}`);

  // ── 9. Persist: create batch_stops rows
  // Skip index 0 (courier start location — not a stop).
  const stopWaypoints = sortedWaypoints.filter((wp) => wp.waypoint_index > 0);

  const batchStopsInsert = stopWaypoints.map((wp, seqIdx) => {
    const inputIdx = wp.waypoint_index;
    const meta     = inputIndexMeta[inputIdx];
    const ord      = allOrders[meta.orderIdx];
    const coords   = meta.stopType === "PICKUP" ? ord.pickup : ord.dropoff;
    const etaSecs  = cumulativeEtas[wp.waypoint_index] ?? 0;
    const etaAt    = new Date(batchStartTime.getTime() + etaSecs * 1000);

    const label =
      meta.stopType === "PICKUP"
        ? `Pick up — ${ord.label}`
        : `Deliver — ${ord.label}`;

    return {
      batch_id:               batchId,
      order_id:               ord.orderId,
      // PostGIS WKT format for geography insert
      location:               `SRID=4326;POINT(${coords[0]} ${coords[1]})`,
      stop_sequence:          seqIdx + 1, // 1-based
      stop_type:              meta.stopType,
      stop_status:            "PENDING",
      label,
      eta_seconds_from_start: etaSecs,
      eta_at:                 etaAt.toISOString(),
    };
  });

  const { error: stopsErr } = await supabase
    .from("batch_stops")
    .insert(batchStopsInsert);

  if (stopsErr) {
    console.error("[batch-engine] Failed to create batch_stops:", stopsErr);
    // Rollback: cancel the batch so it doesn't linger in a broken state
    await supabase
      .from("order_batches")
      .update({ status: "CANCELLED" })
      .eq("id", batchId);

    return new Response(
      JSON.stringify({ error: "Failed to create batch stops" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── 10. Mark courier as unavailable until batch completes
  await supabase
    .from("couriers")
    .update({ is_available: false })
    .eq("id", courier.id);

  console.log(
    `[batch-engine] SUCCESS — batch ${batchId} ` +
    `with ${batchStopsInsert.length} stops ` +
    `assigned to courier ${courier.id}`
  );

  return new Response(
    JSON.stringify({
      success:      true,
      batch_id:     batchId,
      courier_id:   courier.id,
      stops:        batchStopsInsert.length,
      orders:       allOrders.map((o) => o.orderId),
      distance_m:   Math.round(trip.distance),
      duration_s:   Math.round(trip.duration),
      max_detour_s: Math.round(maxDetour),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
