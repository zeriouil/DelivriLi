// =============================================================================
// DelivriLi — Courier PWA: Supabase Realtime Subscription
// File: src/lib/hooks/useCourierBatch.ts
//
// Exports:
//   useCourierBatch(courierId)          — live batch + stop sequence subscription
//   useCourierLocationSync(courierId)   — 15-second GPS position broadcast
// =============================================================================

"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BatchStatus =
  | "PENDING"
  | "ASSIGNED"
  | "IN_TRANSIT"
  | "COMPLETED"
  | "CANCELLED";

export type StopType   = "PICKUP" | "DROPOFF";
export type StopStatus = "PENDING" | "ARRIVED" | "COMPLETED" | "SKIPPED";

export interface OrderBatch {
  id: string;
  courier_id: string;
  status: BatchStatus;
  total_distance_m: number | null;
  total_duration_s: number | null;
  osrm_route_geometry: object | null;
  max_detour_added_s: number | null;
  created_at: string;
  updated_at: string;
}

export interface BatchStop {
  id: string;
  batch_id: string;
  order_id: string;
  stop_sequence: number;
  stop_type: StopType;
  stop_status: StopStatus;
  label: string | null;
  eta_seconds_from_start: number | null;
  eta_at: string | null;
  arrived_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UseCourierBatchResult {
  batch: OrderBatch | null;
  stops: BatchStop[];          // always sorted by stop_sequence ASC
  activeStop: BatchStop | null; // next PENDING stop
  isLoading: boolean;
  error: string | null;
  markStopStatus: (stopId: string, status: StopStatus) => Promise<void>;
  refreshBatch: () => Promise<void>;
}

// ── Supabase singleton ────────────────────────────────────────────────────────
// Import from your shared client module in production:
// import { supabase } from "@/lib/supabase";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// =============================================================================
// Hook: useCourierBatch
// =============================================================================

export function useCourierBatch(courierId: string | null): UseCourierBatchResult {
  const [batch, setBatch]         = useState<OrderBatch | null>(null);
  const [stops, setStops]         = useState<BatchStop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Track all active channels so we can clean them up
  const channelRefs = useRef<RealtimeChannel[]>([]);

  // ── Initial data fetch ───────────────────────────────────────────────────

  const refreshBatch = useCallback(async () => {
    if (!courierId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch the most recent non-terminal batch for this courier
      const { data: batchData, error: batchErr } = await supabase
        .from("order_batches")
        .select("*")
        .eq("courier_id", courierId)
        .in("status", ["PENDING", "ASSIGNED", "IN_TRANSIT"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (batchErr) throw new Error(batchErr.message);

      setBatch(batchData ?? null);

      if (batchData) {
        const { data: stopsData, error: stopsErr } = await supabase
          .from("batch_stops")
          .select("*")
          .eq("batch_id", batchData.id)
          .order("stop_sequence", { ascending: true });

        if (stopsErr) throw new Error(stopsErr.message);
        setStops(stopsData ?? []);
      } else {
        setStops([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[useCourierBatch] refresh error:", msg);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [courierId]);

  // ── Realtime: batch_stops ────────────────────────────────────────────────

  const subscribeToStops = useCallback((batchId: string) => {
    const channelName = `courier-stops:${batchId}`;
    // Avoid duplicate subscriptions
    if (channelRefs.current.some((ch) => ch.topic === channelName)) return;

    const channel = supabase
      .channel(channelName)
      .on<BatchStop>(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "batch_stops",
          filter: `batch_id=eq.${batchId}`,
        },
        (payload: RealtimePostgresChangesPayload<BatchStop>) => {
          console.log(
            `[Realtime] batch_stops event=${payload.eventType}`,
            payload.eventType !== "DELETE"
              ? `seq=${(payload.new as BatchStop)?.stop_sequence}`
              : "deleted"
          );

          setStops((prev) => {
            switch (payload.eventType) {
              case "INSERT": {
                const s = payload.new as BatchStop;
                if (prev.find((p) => p.id === s.id)) return prev;
                return [...prev, s].sort((a, b) => a.stop_sequence - b.stop_sequence);
              }
              case "UPDATE": {
                const updated = payload.new as BatchStop;
                return prev
                  .map((s) => (s.id === updated.id ? updated : s))
                  .sort((a, b) => a.stop_sequence - b.stop_sequence);
              }
              case "DELETE": {
                const deleted = payload.old as Partial<BatchStop>;
                return prev.filter((s) => s.id !== deleted.id);
              }
              default:
                return prev;
            }
          });
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] ${channelName} status: ${status}`);
      });

    channelRefs.current.push(channel);
  }, []);

  // ── Realtime: order_batches ──────────────────────────────────────────────

  const subscribeToBatches = useCallback(() => {
    if (!courierId) return;

    const channelName = `courier-batch:${courierId}`;
    if (channelRefs.current.some((ch) => ch.topic === channelName)) return;

    const channel = supabase
      .channel(channelName)
      .on<OrderBatch>(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_batches",
          filter: `courier_id=eq.${courierId}`,
        },
        (payload: RealtimePostgresChangesPayload<OrderBatch>) => {
          console.log("[Realtime] order_batches change:", payload.eventType);

          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const newBatch = payload.new as OrderBatch;

            // Terminal: clear state
            if (newBatch.status === "COMPLETED" || newBatch.status === "CANCELLED") {
              setBatch(null);
              setStops([]);
              return;
            }

            setBatch((prev) => {
              if (!prev || newBatch.id === prev.id || newBatch.created_at > prev.created_at) {
                return newBatch;
              }
              return prev;
            });

            // Subscribe to stops of the new/updated batch
            subscribeToStops(newBatch.id);
          } else if (payload.eventType === "DELETE") {
            setBatch(null);
            setStops([]);
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] ${channelName} status: ${status}`);
      });

    channelRefs.current.push(channel);
  }, [courierId, subscribeToStops]);

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!courierId) return;

    refreshBatch();
    subscribeToBatches();

    return () => {
      channelRefs.current.forEach((ch) => supabase.removeChannel(ch));
      channelRefs.current = [];
    };
  }, [courierId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Once a batch loads from the initial fetch, subscribe to its stops
  useEffect(() => {
    if (batch?.id) subscribeToStops(batch.id);
  }, [batch?.id, subscribeToStops]);

  // ── Mutation: mark stop status ───────────────────────────────────────────

  const markStopStatus = useCallback(
    async (stopId: string, status: StopStatus) => {
      const now = new Date().toISOString();
      const patch: Partial<BatchStop> = { stop_status: status };

      if (status === "ARRIVED")   patch.arrived_at   = now;
      if (status === "COMPLETED") patch.completed_at = now;

      const { error: updateErr } = await supabase
        .from("batch_stops")
        .update(patch)
        .eq("id", stopId);

      if (updateErr) {
        console.error("[useCourierBatch] markStopStatus error:", updateErr);
        throw new Error(updateErr.message);
      }

      // Optimistic local update
      setStops((prev) =>
        prev.map((s) => (s.id === stopId ? { ...s, ...patch } : s))
      );

      // Check if all stops are now terminal — if so, complete the batch
      setStops((currentStops) => {
        const allDone = currentStops.every(
          (s) => s.stop_status === "COMPLETED" || s.stop_status === "SKIPPED"
        );

        if (allDone && batch?.id) {
          // Mark batch COMPLETED
          supabase
            .from("order_batches")
            .update({ status: "COMPLETED" })
            .eq("id", batch.id)
            .then(({ error: e }) => {
              if (e) console.error("[useCourierBatch] batch complete error:", e);
            });

          // Re-enable courier for new assignments
          if (courierId) {
            supabase
              .from("couriers")
              .update({ is_available: true })
              .eq("id", courierId)
              .then(({ error: e }) => {
                if (e) console.error("[useCourierBatch] courier re-enable error:", e);
              });
          }
        }

        return currentStops;
      });
    },
    [batch?.id, courierId]
  );

  // ── Derived state ─────────────────────────────────────────────────────────

  const sortedStops = [...stops].sort((a, b) => a.stop_sequence - b.stop_sequence);
  const activeStop  = sortedStops.find((s) => s.stop_status === "PENDING") ?? null;

  return { batch, stops: sortedStops, activeStop, isLoading, error, markStopStatus, refreshBatch };
}

// =============================================================================
// Hook: useCourierLocationSync
// Broadcasts courier GPS position every 15 seconds via the
// update_courier_location(p_courier_id, p_lng, p_lat) RPC.
// =============================================================================

export interface LocationSyncOptions {
  intervalMs?: number; // default 15_000
  enabled?: boolean;   // pause sync when no active batch
}

export function useCourierLocationSync(
  courierId: string | null,
  { intervalMs = 15_000, enabled = true }: LocationSyncOptions = {}
) {
  const [isSyncing, setIsSyncing]       = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncError, setSyncError]       = useState<string | null>(null);
  const intervalRef                     = useRef<ReturnType<typeof setInterval> | null>(null);

  const syncLocation = useCallback(async () => {
    if (!courierId || !navigator.geolocation) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 10_000,
        });
      });

      const { longitude, latitude } = position.coords;

      const { error: rpcErr } = await supabase.rpc("update_courier_location", {
        p_courier_id: courierId,
        p_lng:        longitude,
        p_lat:        latitude,
      });

      if (rpcErr) throw new Error(rpcErr.message);

      setLastSyncedAt(new Date());
      console.log(`[LocationSync] ${courierId}: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Location sync failed";
      console.warn("[LocationSync] error:", msg);
      setSyncError(msg);
    } finally {
      setIsSyncing(false);
    }
  }, [courierId]);

  useEffect(() => {
    if (!courierId || !enabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    syncLocation(); // immediate first sync
    intervalRef.current = setInterval(syncLocation, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [courierId, enabled, intervalMs, syncLocation]);

  return { isSyncing, lastSyncedAt, syncError };
}

// =============================================================================
// Usage example (Courier PWA page):
//
// "use client";
// import { useCourierBatch, useCourierLocationSync } from "@/lib/hooks/useCourierBatch";
//
// export default function CourierDashboard({ courierId }: { courierId: string }) {
//   const { batch, stops, activeStop, isLoading, markStopStatus } =
//     useCourierBatch(courierId);
//
//   useCourierLocationSync(courierId, {
//     enabled: batch?.status === "IN_TRANSIT",
//     intervalMs: 15_000,
//   });
//
//   if (isLoading) return <Spinner />;
//   if (!batch)    return <p>No active batch. Stand by...</p>;
//
//   return (
//     <div>
//       <h1>Batch #{batch.id.slice(0, 8)}</h1>
//       <p>Status: {batch.status} | Distance: {batch.total_distance_m}m</p>
//
//       {activeStop && (
//         <div className="active-stop">
//           <h2>{activeStop.stop_type} — {activeStop.label}</h2>
//           <p>ETA: {new Date(activeStop.eta_at!).toLocaleTimeString()}</p>
//           <button onClick={() => markStopStatus(activeStop.id, "ARRIVED")}>
//             I&apos;ve Arrived
//           </button>
//           <button onClick={() => markStopStatus(activeStop.id, "COMPLETED")}>
//             Confirm {activeStop.stop_type === "PICKUP" ? "Pickup" : "Delivery"}
//           </button>
//         </div>
//       )}
//
//       <ol>
//         {stops.map((stop) => (
//           <li key={stop.id} style={{ opacity: stop.stop_status === "COMPLETED" ? 0.4 : 1 }}>
//             #{stop.stop_sequence} [{stop.stop_type}] {stop.label} — {stop.stop_status}
//           </li>
//         ))}
//       </ol>
//     </div>
//   );
// }
// =============================================================================
