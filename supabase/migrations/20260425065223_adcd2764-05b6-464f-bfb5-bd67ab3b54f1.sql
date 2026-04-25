ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_game_check;
ALTER TABLE public.matches
  ADD CONSTRAINT matches_game_check
  CHECK (game IN ('chess', 'checkers', 'backgammon', 'monopoly', 'scrabble'));

ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_status_check;
ALTER TABLE public.matches
  ADD CONSTRAINT matches_status_check
  CHECK (status IN ('open', 'live', 'ended', 'completed', 'cancelled'));
