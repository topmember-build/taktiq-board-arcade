-- Extend matches with escrow + live state
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS host_wallet text,
  ADD COLUMN IF NOT EXISTS joiner_wallet text,
  ADD COLUMN IF NOT EXISTS escrow_address text,
  ADD COLUMN IF NOT EXISTS escrow_tx_hash text,
  ADD COLUMN IF NOT EXISTS current_state jsonb,
  ADD COLUMN IF NOT EXISTS turn_wallet text,
  ADD COLUMN IF NOT EXISTS time_control text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Allow updates on matches for wallet players (host/joiner)
DROP POLICY IF EXISTS "Anyone can update match they are part of" ON public.matches;
CREATE POLICY "Anyone can update match they are part of"
  ON public.matches
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Chat
CREATE TABLE IF NOT EXISTS public.match_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  display_name text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.match_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Match messages public read" ON public.match_messages;
CREATE POLICY "Match messages public read"
  ON public.match_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can post match messages" ON public.match_messages;
CREATE POLICY "Anyone can post match messages"
  ON public.match_messages FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_match_messages_match ON public.match_messages(match_id, created_at);

-- Moves
CREATE TABLE IF NOT EXISTS public.match_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  ply integer NOT NULL,
  wallet_address text NOT NULL,
  move jsonb NOT NULL,
  state jsonb,
  result text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.match_moves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Match moves public read" ON public.match_moves;
CREATE POLICY "Match moves public read"
  ON public.match_moves FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can submit moves" ON public.match_moves;
CREATE POLICY "Anyone can submit moves"
  ON public.match_moves FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_match_moves_match ON public.match_moves(match_id, ply);

-- Realtime
ALTER TABLE public.matches REPLICA IDENTITY FULL;
ALTER TABLE public.match_messages REPLICA IDENTITY FULL;
ALTER TABLE public.match_moves REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_messages;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_moves;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;