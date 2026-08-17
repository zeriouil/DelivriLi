-- =============================================================================
-- DelivriLi — OSRM-Powered Dynamic Order Batching & Autonomous Dispatch Engine
-- Migration: 20260817_osrm_batch_engine.sql
-- Run in Supabase SQL Editor (or via `supabase db push`)
-- =============================================================================

-- ── 0. Extensions ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;         -- spatial geometry/geography types
CREATE EXTENSION IF NOT EXISTS postgis_topology; -- optional: topology support

-- ── 1. Geospatial Columns on Existing Tables ──────────────────────────────────
-- Add a geography point to restaurants so PostGIS can calculate distances.
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS location extensions.geography(POINT, 4326);

-- Add geography point to orders for customer drop-off coordinates.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pickup_location  extensions.geography(POINT, 4326),
  ADD COLUMN IF NOT EXISTS dropoff_location extensions.geography(POINT, 4326);

-- ── 2. Couriers Table ─────────────────────────────────────────────────────────
-- Represents a delivery courier (linked to Supabase Auth user).
CREATE TABLE IF NOT EXISTS public.couriers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT NOT NULL,
  phone_number    TEXT NOT NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  is_available    BOOLEAN DEFAULT TRUE,            -- toggles availability for dispatch
  current_location extensions.geography(POINT, 4326), -- updated by PWA every ~15 s
  last_seen_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Batch Status Enum ───────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.batch_status AS ENUM (
    'PENDING',     -- computed, awaiting courier assignment
    'ASSIGNED',    -- courier accepted the batch
    'IN_TRANSIT',  -- courier is actively delivering
    'COMPLETED',   -- all drops confirmed
    'CANCELLED'    -- batch aborted (courier unavailable, order cancelled, etc.)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 4. Stop Type Enum ─────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.stop_type AS ENUM (
    'PICKUP',   -- courier picks up food at restaurant
    'DROPOFF'   -- courier delivers to customer
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 5. Stop Status Enum ───────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.stop_status AS ENUM (
    'PENDING',    -- not yet reached
    'ARRIVED',    -- courier scanned / confirmed arrival
    'COMPLETED',  -- pickup collected / dropoff handed over
    'SKIPPED'     -- stop skipped (e.g. restaurant not ready, customer unreachable)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 6. order_batches ──────────────────────────────────────────────────────────
-- One row per optimised multi-stop delivery run.
CREATE TABLE IF NOT EXISTS public.order_batches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  courier_id      UUID REFERENCES public.couriers(id) ON DELETE SET NULL,
  status          public.batch_status NOT NULL DEFAULT 'PENDING',

  -- OSRM-derived route metadata
  total_distance_m        INTEGER,   -- total driving distance in metres
  total_duration_s        INTEGER,   -- total driving time in seconds
  osrm_route_geometry     JSONB,     -- encoded polyline / GeoJSON from OSRM /trip

  -- Detour guardrails (stored for audit & debugging)
  max_detour_added_s      INTEGER,   -- maximum extra seconds added for any single order
  detour_threshold_s      INTEGER DEFAULT 360, -- 6 min = 360 s hard cap

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. batch_stops ────────────────────────────────────────────────────────────
-- Sequential waypoints within a batch (pickups + dropoffs).
CREATE TABLE IF NOT EXISTS public.batch_stops (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id        UUID NOT NULL REFERENCES public.order_batches(id) ON DELETE CASCADE,
  order_id        UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,

  -- Spatial: POINT in WGS-84 geographic coordinates
  location        extensions.geography(POINT, 4326) NOT NULL,

  stop_sequence   INTEGER NOT NULL,   -- 1-based: 1 = first stop (Pickup A), 2 = second...
  stop_type       public.stop_type    NOT NULL,
  stop_status     public.stop_status  NOT NULL DEFAULT 'PENDING',

  -- Human-readable label stored for display on courier PWA
  label           TEXT,               -- e.g. "Pick up @ Argana Jemaa", "Drop @ Rue Ibn Batouta"

  -- Estimated arrival times from OSRM
  eta_seconds_from_start INTEGER,     -- cumulative seconds from batch start
  eta_at              TIMESTAMPTZ,    -- absolute ETA (computed on assignment)

  arrived_at      TIMESTAMPTZ,        -- set when courier marks ARRIVED
  completed_at    TIMESTAMPTZ,        -- set when courier marks COMPLETED

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (batch_id, stop_sequence)    -- enforce strict ordering within a batch
);

-- ── 8. GIST Spatial Indexes ───────────────────────────────────────────────────
-- Crucial for sub-millisecond ST_DWithin proximity queries.
CREATE INDEX IF NOT EXISTS idx_couriers_location
  ON public.couriers USING GIST (current_location);

CREATE INDEX IF NOT EXISTS idx_restaurants_location
  ON public.restaurants USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_orders_pickup_location
  ON public.orders USING GIST (pickup_location);

CREATE INDEX IF NOT EXISTS idx_orders_dropoff_location
  ON public.orders USING GIST (dropoff_location);

CREATE INDEX IF NOT EXISTS idx_batch_stops_location
  ON public.batch_stops USING GIST (location);

-- Standard B-Tree indexes for common joins and lookups
CREATE INDEX IF NOT EXISTS idx_batch_stops_batch_id
  ON public.batch_stops (batch_id, stop_sequence);

CREATE INDEX IF NOT EXISTS idx_order_batches_courier_status
  ON public.order_batches (courier_id, status);

CREATE INDEX IF NOT EXISTS idx_couriers_available
  ON public.couriers (is_active, is_available);

-- ── 9. updated_at Triggers ────────────────────────────────────────────────────
-- Reuse the function defined in schema.sql
CREATE TRIGGER update_couriers_updated_at
  BEFORE UPDATE ON public.couriers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_batches_updated_at
  BEFORE UPDATE ON public.order_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batch_stops_updated_at
  BEFORE UPDATE ON public.batch_stops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 10. Helper: Refresh Courier Location ─────────────────────────────────────
-- Called from the PWA every ~15 seconds via RPC.
CREATE OR REPLACE FUNCTION public.update_courier_location(
  p_courier_id UUID,
  p_lng        DOUBLE PRECISION,
  p_lat        DOUBLE PRECISION
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.couriers
  SET
    current_location = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography,
    last_seen_at     = NOW(),
    updated_at       = NOW()
  WHERE id = p_courier_id;
END;
$$;

-- ── 11. Helper: Get Nearby Active Orders ──────────────────────────────────────
-- Used inside the Edge Function but also exposed as RPC for admin dashboards.
-- Returns orders in 'preparing' status within `radius_m` metres of a given point.
CREATE OR REPLACE FUNCTION public.get_nearby_preparing_orders(
  p_lng      DOUBLE PRECISION,
  p_lat      DOUBLE PRECISION,
  p_radius_m INTEGER DEFAULT 1500   -- 1.5 km default
)
RETURNS TABLE (
  order_id          UUID,
  restaurant_id     UUID,
  pickup_lng        DOUBLE PRECISION,
  pickup_lat        DOUBLE PRECISION,
  dropoff_lng       DOUBLE PRECISION,
  dropoff_lat       DOUBLE PRECISION,
  distance_m        DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    o.id                                                        AS order_id,
    o.restaurant_id,
    ST_X(o.pickup_location::geometry)                           AS pickup_lng,
    ST_Y(o.pickup_location::geometry)                           AS pickup_lat,
    ST_X(o.dropoff_location::geometry)                          AS dropoff_lng,
    ST_Y(o.dropoff_location::geometry)                          AS dropoff_lat,
    ST_Distance(
      o.pickup_location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography
    )                                                           AS distance_m
  FROM public.orders o
  WHERE
    o.status = 'preparing'
    AND o.pickup_location IS NOT NULL
    AND o.dropoff_location IS NOT NULL
    -- Order is not already assigned to an active batch
    AND NOT EXISTS (
      SELECT 1
      FROM public.batch_stops bs
      JOIN public.order_batches ob ON ob.id = bs.batch_id
      WHERE bs.order_id = o.id
        AND ob.status NOT IN ('COMPLETED', 'CANCELLED')
    )
    AND ST_DWithin(
      o.pickup_location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography,
      p_radius_m
    )
  ORDER BY distance_m ASC;
$$;

-- ── 12. Row Level Security ────────────────────────────────────────────────────
ALTER TABLE public.couriers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_batches   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_stops     ENABLE ROW LEVEL SECURITY;

-- Couriers: only the courier themselves can see/update their own row
DROP POLICY IF EXISTS "Courier self-select" ON public.couriers;
CREATE POLICY "Courier self-select" ON public.couriers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Courier self-update" ON public.couriers;
CREATE POLICY "Courier self-update" ON public.couriers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Service-role (Edge Functions) can do everything
DROP POLICY IF EXISTS "Service full access couriers" ON public.couriers;
CREATE POLICY "Service full access couriers" ON public.couriers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Batches: couriers see their own batches; service-role has full access
DROP POLICY IF EXISTS "Courier batch select" ON public.order_batches;
CREATE POLICY "Courier batch select" ON public.order_batches
  FOR SELECT TO authenticated
  USING (courier_id IN (
    SELECT id FROM public.couriers WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Service full access batches" ON public.order_batches;
CREATE POLICY "Service full access batches" ON public.order_batches
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Batch stops: couriers see stops for their own batches
DROP POLICY IF EXISTS "Courier stops select" ON public.batch_stops;
CREATE POLICY "Courier stops select" ON public.batch_stops
  FOR SELECT TO authenticated
  USING (batch_id IN (
    SELECT ob.id FROM public.order_batches ob
    JOIN public.couriers c ON c.id = ob.courier_id
    WHERE c.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Courier stops update" ON public.batch_stops;
CREATE POLICY "Courier stops update" ON public.batch_stops
  FOR UPDATE TO authenticated
  USING (batch_id IN (
    SELECT ob.id FROM public.order_batches ob
    JOIN public.couriers c ON c.id = ob.courier_id
    WHERE c.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Service full access stops" ON public.batch_stops;
CREATE POLICY "Service full access stops" ON public.batch_stops
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 13. Realtime Publication ─────────────────────────────────────────────────
-- Couriers subscribe to these tables for instant route updates.
ALTER PUBLICATION supabase_realtime ADD TABLE public.batch_stops;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_batches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.couriers;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
