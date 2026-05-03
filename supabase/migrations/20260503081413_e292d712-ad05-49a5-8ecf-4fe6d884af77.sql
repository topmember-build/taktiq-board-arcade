-- Hide sensitive Google identity fields from public reads via a view.
-- Base table SELECT becomes restricted; clients query the public view instead.

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Allow only the linked Google user to read their own full profile row directly.
CREATE POLICY "Owner can read own full profile"
  ON public.profiles FOR SELECT
  USING (google_user_id = auth.uid());

-- Public-safe view excluding google_email and google_user_id.
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT
  id,
  wallet_address,
  display_name,
  avatar_url,
  trust_score,
  total_won,
  total_wagered,
  referral_code,
  referred_by,
  created_at,
  updated_at
FROM public.profiles;

-- The view runs with invoker rights, but we need anon/auth to be able to read
-- the underlying rows through the view. Add a policy that exposes only the
-- non-sensitive columns implicitly by limiting what the view selects, gated by
-- a permissive policy that's still scoped (we keep base SELECT owner-only,
-- but views with security_invoker need the caller to satisfy RLS — so add a
-- separate public-read policy that only matches when the query is coming
-- through the view by checking that no sensitive columns are needed).
--
-- Simpler/correct approach: switch the view to security definer-equivalent by
-- making it owned by postgres without security_invoker. Recreate accordingly.
DROP VIEW public.profiles_public;
CREATE VIEW public.profiles_public AS
SELECT
  id,
  wallet_address,
  display_name,
  avatar_url,
  trust_score,
  total_won,
  total_wagered,
  referral_code,
  referred_by,
  created_at,
  updated_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;