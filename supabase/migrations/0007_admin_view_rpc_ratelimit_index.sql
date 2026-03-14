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
