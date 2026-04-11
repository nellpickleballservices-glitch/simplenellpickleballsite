-- ========== 0001_initial_schema.sql ==========

-- NELL Pickleball Club — Initial Schema
-- Run in: Supabase Dashboard -> SQL Editor
-- Creates all 7 application tables with RLS enabled.
-- After running, verify in: Authentication -> Policies

-- Source: https://supabase.com/docs/guides/database/postgres/row-level-security
-- Performance tip: wrap auth.uid() in (SELECT ...) to allow Postgres query planner caching

-- ============================================================
-- 1. profiles (references auth.users)
-- ============================================================
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name   TEXT NOT NULL,
  last_name    TEXT NOT NULL,
  phone        TEXT,
  avatar_url   TEXT,                          -- Phase 3 avatar upload
  locale_pref  TEXT DEFAULT 'es',             -- i18n language preference
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"   ON profiles FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = id);

-- ============================================================
-- 2. locations (no FK — standalone)
-- ============================================================
CREATE TABLE locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  address     TEXT,
  lat         DECIMAL(10, 8),                 -- GPS coordinates (Phase 3 map)
  lng         DECIMAL(11, 8),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can read locations" ON locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role full access on locations" ON locations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 3. courts (references locations)
-- ============================================================
CREATE TABLE courts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open',   -- 'open' | 'closed' | 'maintenance'
  lat         DECIMAL(10, 8),                 -- GPS coordinates (Phase 3)
  lng         DECIMAL(11, 8),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated can read courts" ON courts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role full access on courts" ON courts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 4. memberships (references profiles, locations for Basic plan restriction)
-- ============================================================
CREATE TABLE memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_type       TEXT NOT NULL,               -- 'vip' | 'basic' | 'day_pass'
  status          TEXT NOT NULL DEFAULT 'pending', -- 'active' | 'cancelled' | 'past_due' | 'pending'
  payment_method  TEXT DEFAULT 'stripe',       -- 'stripe' | 'cash' (Phase 2)
  location_id     UUID REFERENCES locations(id), -- Basic plan location restriction
  stripe_subscription_id TEXT,
  stripe_customer_id     TEXT,
  current_period_end     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own membership"   ON memberships FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Service role full access on memberships" ON memberships FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 5. reservations (references profiles, courts)
-- ============================================================
CREATE TABLE reservations (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  court_id                    UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  starts_at                   TIMESTAMPTZ NOT NULL,
  ends_at                     TIMESTAMPTZ NOT NULL,
  reservation_user_first_name TEXT NOT NULL,  -- snapshot at booking time
  reservation_user_last_name  TEXT NOT NULL,  -- snapshot at booking time
  status                      TEXT NOT NULL DEFAULT 'confirmed',
  reminder_sent               BOOLEAN DEFAULT FALSE,
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own reservations"   ON reservations FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert own reservations" ON reservations FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update own reservations" ON reservations FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Service role full access on reservations" ON reservations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 6. events (references locations)
-- ============================================================
CREATE TABLE events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_es       TEXT NOT NULL,
  title_en       TEXT NOT NULL,
  description_es TEXT,
  description_en TEXT,
  event_date     TIMESTAMPTZ NOT NULL,
  location_id    UUID REFERENCES locations(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read events" ON events FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can read events" ON events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role full access on events" ON events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 7. content_blocks (standalone)
-- ============================================================
CREATE TABLE content_blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_key   TEXT NOT NULL UNIQUE,
  block_type  TEXT NOT NULL,               -- 'rich_text' | 'plain_text'
  content_es  TEXT,
  content_en  TEXT,
  sort_order  INT DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE content_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon can read content_blocks" ON content_blocks FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can read content_blocks" ON content_blocks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role full access on content_blocks" ON content_blocks FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ========== 0002_webhook_events.sql ==========

-- NELL Pickleball Club — Migration 0002: Webhook Events + Membership Constraints
-- Run in: Supabase Dashboard -> SQL Editor (after 0001_initial_schema.sql)

-- ============================================================
-- 1. webhook_events table (Stripe webhook idempotency)
-- ============================================================
CREATE TABLE webhook_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type      TEXT NOT NULL,
  processed_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on webhook_events"
  ON webhook_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 2. UNIQUE constraint on memberships.user_id (required for upsert)
-- ============================================================
-- Enables: supabase.from('memberships').upsert({ onConflict: 'user_id' })
-- One user = one membership row.
ALTER TABLE memberships ADD CONSTRAINT memberships_user_id_key UNIQUE (user_id);

-- ============================================================
-- 3. Add memberships to supabase_realtime publication
-- ============================================================
-- Required for post-checkout Realtime listener.
-- Without this, Realtime subscription reports SUBSCRIBED but never fires change events.
ALTER PUBLICATION supabase_realtime ADD TABLE memberships;

-- ========== 0003_reservations.sql ==========

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

-- ========== 0004_pg_cron_reminder.sql ==========

-- NELL Pickleball Club — pg_cron Session Reminder Schedule
-- Run in: Supabase Dashboard -> SQL Editor (after 0003)
--
-- This migration enables pg_cron and pg_net extensions and creates a cron job
-- that invokes the session-reminder Edge Function every minute.
--
-- PREREQUISITES:
--   1. Deploy the Edge Function: supabase functions deploy session-reminder
--   2. Set the RESEND_API_KEY secret: supabase secrets set RESEND_API_KEY=re_xxxxx
--   3. Store project URL and anon key in Vault (see below)
--
-- VAULT SETUP (Supabase Dashboard > Database > Vault):
--   - Create secret named 'project_url' with value: https://YOUR_PROJECT_REF.supabase.co
--   - Create secret named 'anon_key' with value: YOUR_ANON_KEY
--   Or run these SQL statements with real values:
--     SELECT vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
--     SELECT vault.create_secret('YOUR_ANON_KEY', 'anon_key');

-- ============================================================
-- 1. Enable required extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- 2. Store Edge Function URL and anon key in Vault
--    IMPORTANT: Replace placeholder values before running!
-- ============================================================
SELECT vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
SELECT vault.create_secret('YOUR_ANON_KEY', 'anon_key');

-- ============================================================
-- 3. Schedule: invoke session-reminder every minute
-- ============================================================
SELECT cron.schedule(
  'session-reminder',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/session-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ========== 0005_admin_events_cms.sql ==========

-- NELL Pickleball Club — Admin, Events enhancements, CMS seed data
-- Run in: Supabase Dashboard -> SQL Editor
-- Adds event columns, court maintenance columns, admin reservation tracking,
-- and seeds content_blocks for Phase 5 pages.

-- ============================================================
-- 1. Events table enhancements
-- ============================================================
ALTER TABLE events ADD COLUMN event_type TEXT NOT NULL DEFAULT 'social'
  CHECK (event_type IN ('tournament', 'training', 'social'));
ALTER TABLE events ADD COLUMN start_time TIME;
ALTER TABLE events ADD COLUMN end_time TIME;
ALTER TABLE events ADD COLUMN image_url TEXT;

-- ============================================================
-- 2. Courts maintenance window columns
-- ============================================================
ALTER TABLE courts ADD COLUMN maintenance_start TIMESTAMPTZ;
ALTER TABLE courts ADD COLUMN maintenance_end TIMESTAMPTZ;

-- ============================================================
-- 3. Reservations admin tracking
-- ============================================================
ALTER TABLE reservations ADD COLUMN created_by_admin BOOLEAN DEFAULT FALSE;

-- ============================================================
-- 4. Seed content_blocks for Phase 5 pages (ON CONFLICT DO NOTHING)
-- ============================================================

-- Home page blocks
INSERT INTO content_blocks (block_key, block_type, content_es, content_en, sort_order)
VALUES
  ('home_hero', 'rich_text', '<h2>Bienvenido a NELL</h2><p>Contenido pendiente...</p>', '<h2>Welcome to NELL</h2><p>Content pending...</p>', 1),
  ('home_overview', 'rich_text', '<h2>Sobre NELL</h2><p>Contenido pendiente...</p>', '<h2>About NELL</h2><p>Content pending...</p>', 2)
ON CONFLICT (block_key) DO NOTHING;

-- About page blocks
INSERT INTO content_blocks (block_key, block_type, content_es, content_en, sort_order)
VALUES
  ('about_vision', 'rich_text', '<h2>Nuestra Vision</h2><p>Contenido pendiente...</p>', '<h2>Our Vision</h2><p>Content pending...</p>', 1),
  ('about_mission', 'rich_text', '<h2>Nuestra Mision</h2><p>Contenido pendiente...</p>', '<h2>Our Mission</h2><p>Content pending...</p>', 2),
  ('about_values', 'rich_text', '<h2>Nuestros Valores</h2><p>Contenido pendiente...</p>', '<h2>Our Values</h2><p>Content pending...</p>', 3)
ON CONFLICT (block_key) DO NOTHING;

-- Learn page blocks
INSERT INTO content_blocks (block_key, block_type, content_es, content_en, sort_order)
VALUES
  ('learn_origin', 'rich_text', '<h2>Origen del Pickleball</h2><p>Contenido pendiente...</p>', '<h2>Origin of Pickleball</h2><p>Content pending...</p>', 1),
  ('learn_rules', 'rich_text', '<h2>Reglas del Juego</h2><p>Contenido pendiente...</p>', '<h2>Game Rules</h2><p>Content pending...</p>', 2),
  ('learn_scoring', 'rich_text', '<h2>Puntuacion</h2><p>Contenido pendiente...</p>', '<h2>Scoring</h2><p>Content pending...</p>', 3),
  ('learn_equipment', 'rich_text', '<h2>Equipamiento</h2><p>Contenido pendiente...</p>', '<h2>Equipment</h2><p>Content pending...</p>', 4)
ON CONFLICT (block_key) DO NOTHING;

-- FAQ page blocks
INSERT INTO content_blocks (block_key, block_type, content_es, content_en, sort_order)
VALUES
  ('faq_general', 'rich_text', '<h2>Preguntas Generales</h2><p>Contenido pendiente...</p>', '<h2>General Questions</h2><p>Content pending...</p>', 1),
  ('faq_membership', 'rich_text', '<h2>Membresia</h2><p>Contenido pendiente...</p>', '<h2>Membership</h2><p>Content pending...</p>', 2),
  ('faq_reservations', 'rich_text', '<h2>Reservas</h2><p>Contenido pendiente...</p>', '<h2>Reservations</h2><p>Content pending...</p>', 3),
  ('faq_rules', 'rich_text', '<h2>Reglas del Club</h2><p>Contenido pendiente...</p>', '<h2>Club Rules</h2><p>Content pending...</p>', 4)
ON CONFLICT (block_key) DO NOTHING;

-- ========== 0006_footer_social_links.sql ==========

-- Migration: Seed content blocks for public pages
-- Footer social links, learn page court dimensions, contact info

INSERT INTO content_blocks (block_key, block_type, content_es, content_en, sort_order)
VALUES
  (
    'footer_social_links',
    'plain_text',
    '{"instagram":"https://instagram.com/nellpickleball","facebook":"https://facebook.com/nellpickleball"}',
    '{"instagram":"https://instagram.com/nellpickleball","facebook":"https://facebook.com/nellpickleball"}',
    100
  ),
  (
    'learn_court_dimensions',
    'rich_text',
    '<p>Una cancha de pickleball mide 20x44 pies (6.1x13.4 metros), similar a una cancha de dobles de badminton. La zona de no-volea ("kitchen") se extiende 7 pies desde la red a cada lado.</p>',
    '<p>A pickleball court measures 20x44 feet (6.1x13.4 meters), similar to a doubles badminton court. The non-volley zone ("kitchen") extends 7 feet from the net on each side.</p>',
    200
  ),
  (
    'contact_info',
    'plain_text',
    '{"email":"nellpickleball@gmail.com","phone":"+18091234567"}',
    '{"email":"nellpickleball@gmail.com","phone":"+18091234567"}',
    300
  )
ON CONFLICT (block_key) DO NOTHING;

-- ========== 0007_admin_view_rpc_ratelimit_index.sql ==========

-- NELL Pickleball Club — Admin View, Batch Reorder RPC, Rate Limit Table, Indexes, Cleanup Job
-- Run in: Supabase Dashboard -> SQL Editor (after 0006)
--
-- This migration creates:
--   1. admin_users_view — Joins profiles with auth.users for admin queries
--   2. batch_reorder_content_blocks() — RPC for atomic content block reordering
--   3. chat_rate_limits table — Persistent rate limiting for chat sessions
--   4. Composite index on reservations(court_id, starts_at)
--   5. pg_cron job to clean stale rate limit rows hourly

-- ============================================================
-- 1. Admin Users View
-- ============================================================
-- SAFETY: Only queried via supabaseAdmin (service_role) which bypasses RLS.
-- Never expose this view through the PostgREST API.
CREATE OR REPLACE VIEW admin_users_view AS
SELECT
  p.id,
  p.first_name,
  p.last_name,
  p.phone,
  p.created_at,
  u.email,
  u.last_sign_in_at,
  u.banned_until,
  u.raw_app_meta_data->>'role' AS role
FROM public.profiles p
JOIN auth.users u ON u.id = p.id;

-- Revoke access from anon and authenticated roles to prevent API exposure
REVOKE ALL ON admin_users_view FROM anon, authenticated;
GRANT SELECT ON admin_users_view TO service_role;

-- ============================================================
-- 2. Batch Reorder Content Blocks RPC
-- ============================================================
-- Accepts a JSONB array of {id, sort_order} objects and updates atomically.
CREATE OR REPLACE FUNCTION batch_reorder_content_blocks(
  items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    UPDATE content_blocks
    SET sort_order = (item->>'sort_order')::int,
        updated_at = now()
    WHERE id = (item->>'id')::uuid;
  END LOOP;
END;
$$;

-- Grant only to service_role (admin actions use supabaseAdmin)
REVOKE ALL ON FUNCTION batch_reorder_content_blocks(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION batch_reorder_content_blocks(jsonb) TO service_role;

-- ============================================================
-- 3. Chat Rate Limits Table
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_rate_limits (
  session_id text PRIMARY KEY,
  message_count int NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_chat_rate_limits_window ON chat_rate_limits (window_start);

-- ============================================================
-- 4. Composite Index on Reservations
-- ============================================================
-- Speeds up court_id + starts_at range queries for availability checks
CREATE INDEX IF NOT EXISTS idx_reservations_court_starts ON reservations (court_id, starts_at);

-- ============================================================
-- 5. pg_cron Cleanup Job for Stale Rate Limit Rows
-- ============================================================
-- Runs hourly to delete abandoned chat sessions older than 2 hours.
-- Prevents table bloat from sessions that never return.
SELECT cron.schedule(
  'cleanup-stale-rate-limits',
  '0 * * * *',
  $$DELETE FROM public.chat_rate_limits WHERE window_start < now() - interval '2 hours'$$
);

-- ========== 0008_country_column.sql ==========

-- 0008_country_column.sql
-- Add country column to profiles and is_tourist_price to reservations
-- Update RLS policy to prevent user self-modification of country
-- Update admin_users_view to include country

-- 1. Add country column with default 'DO' for existing users
ALTER TABLE profiles ADD COLUMN country CHAR(2) NOT NULL DEFAULT 'DO';

-- 2. Add is_tourist_price flag to reservations (for Phase 5)
ALTER TABLE reservations ADD COLUMN is_tourist_price BOOLEAN DEFAULT false;

-- 3. Drop and recreate the update policy to prevent country self-modification
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK (
    (SELECT auth.uid()) = id
    AND country IS NOT DISTINCT FROM (SELECT p.country FROM profiles p WHERE p.id = (SELECT auth.uid()))
  );

-- 4. Update admin_users_view to include country
DROP VIEW IF EXISTS admin_users_view;
CREATE VIEW admin_users_view AS
SELECT
  p.id,
  p.first_name,
  p.last_name,
  p.phone,
  p.country,
  p.created_at,
  u.email,
  u.last_sign_in_at,
  u.banned_until,
  u.raw_app_meta_data->>'role' AS role
FROM public.profiles p
JOIN auth.users u ON u.id = p.id;

-- 5. Re-grant permissions on admin_users_view
REVOKE ALL ON admin_users_view FROM anon, authenticated;
GRANT SELECT ON admin_users_view TO service_role;

-- ========== 0009_session_pricing.sql ==========

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

-- ========== 0010_default_session_price.sql ==========

-- Migration: Add default_session_price_cents to app_config
-- Replaces the hardcoded $10 (1000 cents) fallback in createReservationAction
-- Used when no session_pricing row exists for a court + day-of-week

INSERT INTO app_config (key, value) VALUES
  ('default_session_price_cents', '1000'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ========== 0011_locations_name_unique.sql ==========

-- Add unique constraint on locations.name so that
-- upsert (ON CONFLICT (name)) works in addCourtAction.
ALTER TABLE locations ADD CONSTRAINT locations_name_unique UNIQUE (name);

-- ========== 0012_location_hero_description.sql ==========

-- Add hero image and description to locations for location card display.
ALTER TABLE locations ADD COLUMN hero_image_url TEXT;
ALTER TABLE locations ADD COLUMN description TEXT;

-- ========== 0013_practice_sessions_and_durations.sql ==========

-- Add practice session time windows and per-mode session durations to court_config

ALTER TABLE court_config
  ADD COLUMN practice_start TIME,
  ADD COLUMN practice_end TIME,
  ADD COLUMN full_court_duration_minutes INT NOT NULL DEFAULT 60,
  ADD COLUMN open_play_duration_minutes INT NOT NULL DEFAULT 60,
  ADD COLUMN practice_duration_minutes INT NOT NULL DEFAULT 30;

-- Allow 'practice' as a booking_mode on reservations
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_booking_mode_check;
ALTER TABLE reservations ADD CONSTRAINT reservations_booking_mode_check
  CHECK (booking_mode IN ('full_court', 'open_play', 'vip_guest', 'practice'));

-- Allow 'practice' as a mode on court_pricing
ALTER TABLE court_pricing DROP CONSTRAINT IF EXISTS court_pricing_mode_check;
ALTER TABLE court_pricing ADD CONSTRAINT court_pricing_mode_check
  CHECK (mode IN ('full_court', 'open_play', 'practice'));

-- Update the spot constraint to also allow practice mode without spot
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS chk_spot_required;
ALTER TABLE reservations ADD CONSTRAINT chk_spot_required
  CHECK (booking_mode IN ('full_court', 'practice') OR spot_number IS NOT NULL);

-- ========== 0014_fix_profiles_rls_recursion.sql ==========

-- 0014_fix_profiles_rls_recursion.sql
-- Fix infinite recursion in profiles UPDATE policy.
-- The previous policy queried profiles inside its own WITH CHECK,
-- causing a circular RLS evaluation.
-- Instead, use a security-definer helper function to read country
-- bypassing RLS and breaking the cycle.

-- 1. Helper that reads the current country without RLS
CREATE OR REPLACE FUNCTION public.get_own_country()
RETURNS CHAR(2)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT country FROM profiles WHERE id = auth.uid();
$$;

-- 2. Replace the recursive policy
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK (
    (SELECT auth.uid()) = id
    AND country IS NOT DISTINCT FROM public.get_own_country()
  );

-- ========== 0015_court_address.sql ==========

-- Add address column to courts table
ALTER TABLE courts ADD COLUMN address TEXT;

-- ========== 0016_event_price.sql ==========

-- Add optional price to events (stored in cents, NULL = free)
ALTER TABLE events ADD COLUMN price_cents INT DEFAULT NULL;

-- ========== 0017_gallery_items.sql ==========

-- Gallery items table for public photo/video gallery
create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  media_type text not null check (media_type in ('image', 'video')),
  url text not null,
  thumbnail_url text,
  title_es text,
  title_en text,
  caption_es text,
  caption_en text,
  grid_size text not null default '1x1' check (grid_size in ('1x1', '1x2', '2x1', '2x2')),
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.gallery_items enable row level security;

-- Public read: only visible items
create policy "gallery_items_select_public"
  on public.gallery_items for select
  to anon, authenticated
  using (is_visible = true);

-- Service-role full access (admin actions use supabaseAdmin)
create policy "gallery_items_service_role_all"
  on public.gallery_items for all
  to service_role
  using (true)
  with check (true);
