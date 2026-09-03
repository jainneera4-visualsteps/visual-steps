-- Stores privacy-scoped learning-game attempts for parent progress reports.
-- Safe to run repeatedly. Game content and answers are not stored.

CREATE TABLE IF NOT EXISTS public.game_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kid_id UUID NOT NULL REFERENCES public.kids(id) ON DELETE CASCADE,
  game_key TEXT NOT NULL CHECK (game_key IN ('place_value_builder', 'expanded_form', 'digit_value', 'place_value_clues')),
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
  score INTEGER NOT NULL CHECK (score IN (0, 1)),
  total_questions INTEGER NOT NULL DEFAULT 1 CHECK (total_questions = 1),
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS game_results_kid_completed_idx
  ON public.game_results(kid_id, completed_at DESC);

ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.game_results FROM anon, authenticated;
