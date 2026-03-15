-- Migration: Add default_session_price_cents to app_config
-- Replaces the hardcoded $10 (1000 cents) fallback in createReservationAction
-- Used when no session_pricing row exists for a court + day-of-week

INSERT INTO app_config (key, value) VALUES
  ('default_session_price_cents', '1000'::jsonb)
ON CONFLICT (key) DO NOTHING;
