-- Allow public inserts for anti-cheat audit logging from clients
CREATE POLICY "Anyone can submit anti-cheat events"
ON public.anticheat_events
FOR INSERT
TO public
WITH CHECK (true);

-- Index for quick per-match audit lookups and dashboard queries
CREATE INDEX IF NOT EXISTS idx_anticheat_events_match_id ON public.anticheat_events(match_id);
CREATE INDEX IF NOT EXISTS idx_anticheat_events_created_at ON public.anticheat_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anticheat_events_severity ON public.anticheat_events(severity);