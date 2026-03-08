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
