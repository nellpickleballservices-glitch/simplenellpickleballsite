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
