-- Replace permissive INSERT policy on match_moves with a deny-all policy.
-- All inserts must now go through the server endpoint (uses service role).
DROP POLICY IF EXISTS "Anyone can submit moves" ON public.match_moves;

CREATE POLICY "Block direct client inserts on match_moves"
ON public.match_moves
FOR INSERT
TO public
WITH CHECK (false);
