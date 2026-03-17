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
