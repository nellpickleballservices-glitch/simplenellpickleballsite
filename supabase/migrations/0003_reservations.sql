-- NELL Pickleball Club — Reservations Schema Enhancement
-- Run in: Supabase Dashboard -> SQL Editor (after 0001 and 0002)
-- Adds: btree_gist extension, court_config, app_config, court_pricing tables,
--        reservation columns for booking modes & payments, exclusion constraints,
--        and seed data for 1 location + 3 courts.

-- ============================================================
-- 1. Enable btree_gist extension (required for EXCLUDE constraints with =)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================
-- 2. court_config — admin-managed schedule per court per day type
-- ============================================================
CREATE TABLE court_config (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id         UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  day_type         TEXT NOT NULL CHECK (day_type IN ('weekday', 'weekend')),
  open_time        TIME NOT NULL,
  close_time       TIME NOT NULL,
  full_court_start TIME,
  full_court_end   TIME,
  open_play_start  TIME,
  open_play_end    TIME,
  UNIQUE (court_id, day_type)
);
ALTER TABLE court_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can read court_config" ON court_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role full access on court_config" ON court_config FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 3. app_config — key-value configuration store
-- ============================================================
CREATE TABLE app_config (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL
);
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can read app_config" ON app_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role full access on app_config" ON app_config FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed default config values
INSERT INTO app_config (key, value) VALUES
  ('member_advance_booking_hours', '72'::jsonb),
  ('non_member_advance_booking_hours', '24'::jsonb),
  ('cancellation_window_hours', '2'::jsonb),
  ('vip_guest_limit', '1'::jsonb),
  ('pending_payment_hold_hours', '2'::jsonb),
  ('session_price_default', '10'::jsonb);

-- ============================================================
-- 4. court_pricing — per-court pricing by booking mode
-- ============================================================
CREATE TABLE court_pricing (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id   UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  mode       TEXT NOT NULL CHECK (mode IN ('full_court', 'open_play')),
  price_cents INT NOT NULL DEFAULT 1000,
  UNIQUE (court_id, mode)
);
ALTER TABLE court_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can read court_pricing" ON court_pricing FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role full access on court_pricing" ON court_pricing FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 5. ALTER reservations — add booking mode, spot, payment columns
-- ============================================================
ALTER TABLE reservations
  ADD COLUMN booking_mode    TEXT NOT NULL DEFAULT 'open_play'
    CHECK (booking_mode IN ('full_court', 'open_play')),
  ADD COLUMN spot_number     INT
    CHECK (spot_number BETWEEN 1 AND 4),
  ADD COLUMN payment_status  TEXT NOT NULL DEFAULT 'free'
    CHECK (payment_status IN ('free', 'pending_payment', 'paid', 'cash_pending')),
  ADD COLUMN payment_method  TEXT
    CHECK (payment_method IN ('stripe', 'cash')),
  ADD COLUMN stripe_payment_id TEXT,
  ADD COLUMN guest_name      TEXT,
  ADD COLUMN price_cents     INT NOT NULL DEFAULT 0;

-- ============================================================
-- 6. Enforce status values and booking mode / spot_number consistency
-- ============================================================

ALTER TABLE reservations
  ADD CONSTRAINT valid_reservation_status
  CHECK (status IN ('confirmed', 'pending_payment', 'cancelled', 'expired'));

ALTER TABLE reservations
  ADD CONSTRAINT open_play_requires_spot
  CHECK (booking_mode = 'full_court' OR spot_number IS NOT NULL);

-- ============================================================
-- 7. Exclusion constraint — prevent double-booking (all modes)
-- ============================================================
-- Uses int4range to unify full_court and open_play into one constraint:
--   full_court  → int4range(1, 5) covers all 4 spots
--   open_play   → int4range(spot, spot+1) covers just that spot
-- Overlapping ranges = conflict, so full_court blocks all open_play and vice versa.

ALTER TABLE reservations
  ADD CONSTRAINT no_double_booking
  EXCLUDE USING GIST (
    court_id WITH =,
    int4range(
      CASE WHEN booking_mode = 'full_court' THEN 1 ELSE spot_number END,
      CASE WHEN booking_mode = 'full_court' THEN 5 ELSE spot_number + 1 END
    ) WITH &&,
    tstzrange(starts_at, ends_at) WITH &&
  )
  WHERE (status NOT IN ('cancelled', 'expired'));

-- ============================================================
-- 8. Update RLS — all authenticated users can see reservations (for availability)
-- ============================================================

-- Drop owner-only SELECT policy (availability display needs all reservations visible)
DROP POLICY IF EXISTS "Users can read own reservations" ON reservations;

-- Replace with open SELECT (app layer filters personal details)
CREATE POLICY "All authenticated can read court reservations"
  ON reservations FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 9. Seed data — 1 location, 3 courts, configs, pricing
-- ============================================================

-- Location: NELL Pickleball Club (Santo Domingo area)
INSERT INTO locations (id, name, address, lat, lng) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'NELL Pickleball Club',
   'Av. Abraham Lincoln, Santo Domingo, Dominican Republic',
   18.47186100, -69.93955700)
ON CONFLICT (id) DO NOTHING;

-- 3 Courts at the location
INSERT INTO courts (id, location_id, name, status, lat, lng) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Court 1', 'open', 18.47186100, -69.93955700),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'Court 2', 'open', 18.47186200, -69.93955800),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   'Court 3', 'open', 18.47186300, -69.93955900)
ON CONFLICT (id) DO NOTHING;

-- Court config: weekday and weekend schedules for each court
INSERT INTO court_config (court_id, day_type, open_time, close_time, full_court_start, full_court_end, open_play_start, open_play_end) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'weekday', '07:00', '22:00', '07:00', '17:00', '17:00', '22:00'),
  ('c0000000-0000-0000-0000-000000000001', 'weekend', '07:00', '22:00', '07:00', '15:00', '15:00', '22:00'),
  ('c0000000-0000-0000-0000-000000000002', 'weekday', '07:00', '22:00', '07:00', '17:00', '17:00', '22:00'),
  ('c0000000-0000-0000-0000-000000000002', 'weekend', '07:00', '22:00', '07:00', '15:00', '15:00', '22:00'),
  ('c0000000-0000-0000-0000-000000000003', 'weekday', '07:00', '22:00', '07:00', '17:00', '17:00', '22:00'),
  ('c0000000-0000-0000-0000-000000000003', 'weekend', '07:00', '22:00', '07:00', '15:00', '15:00', '22:00')
ON CONFLICT (court_id, day_type) DO NOTHING;

-- Court pricing: full_court and open_play for each court at $10 (1000 cents)
INSERT INTO court_pricing (court_id, mode, price_cents) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'full_court', 1000),
  ('c0000000-0000-0000-0000-000000000001', 'open_play', 1000),
  ('c0000000-0000-0000-0000-000000000002', 'full_court', 1000),
  ('c0000000-0000-0000-0000-000000000002', 'open_play', 1000),
  ('c0000000-0000-0000-0000-000000000003', 'full_court', 1000),
  ('c0000000-0000-0000-0000-000000000003', 'open_play', 1000)
ON CONFLICT (court_id, mode) DO NOTHING;
