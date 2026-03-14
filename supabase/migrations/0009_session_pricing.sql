-- NELL Pickleball Club — Session Pricing (day-of-week)
-- Run in: Supabase Dashboard -> SQL Editor (after 0008)
-- Adds: session_pricing table, tourist_surcharge_pct config, default pricing seed

-- ============================================================
-- 1. session_pricing — per-court, per-day-of-week pricing
-- ============================================================
CREATE TABLE session_pricing (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id    UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  day_of_week INT  NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  price_cents INT  NOT NULL CHECK (price_cents >= 0),
  UNIQUE (court_id, day_of_week)
);

ALTER TABLE session_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can read session_pricing"
  ON session_pricing FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role full access on session_pricing"
  ON session_pricing FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 2. Seed tourist_surcharge_pct in app_config (25 = 25%)
-- ============================================================
INSERT INTO app_config (key, value) VALUES
  ('tourist_surcharge_pct', '25'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 3. Seed default session pricing — all courts, all 7 days at $10
-- ============================================================
INSERT INTO session_pricing (court_id, day_of_week, price_cents)
SELECT c.id, d.day, 1000
FROM courts c
CROSS JOIN generate_series(0, 6) AS d(day)
ON CONFLICT (court_id, day_of_week) DO NOTHING;
