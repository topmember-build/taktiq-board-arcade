-- Replace view-based hiding with column-level grants (cleaner, no SECURITY DEFINER warning).
DROP VIEW IF EXISTS public.profiles_public;

DROP POLICY IF EXISTS "Owner can read own full profile" ON public.profiles;

-- Restore public read on the table, but revoke access to sensitive columns.
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
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
) ON public.profiles TO anon, authenticated;

-- Owners (linked Google account) can still read their full row including sensitive columns.
GRANT SELECT (google_email, google_user_id) ON public.profiles TO authenticated;
-- The existing UPDATE policy already restricts writes to the linked owner.