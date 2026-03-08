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
CREATE POLICY "Users can update own reservations" ON reservations FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id);
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
CREATE POLICY "Public can read events" ON events FOR SELECT TO authenticated USING (true);
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
CREATE POLICY "Public can read content_blocks" ON content_blocks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Service role full access on content_blocks" ON content_blocks FOR ALL TO service_role USING (true) WITH CHECK (true);
