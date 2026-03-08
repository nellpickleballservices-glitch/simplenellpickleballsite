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
