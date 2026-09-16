-- Groups game answers into play sessions and stores the evidence parents need
-- to understand strengths, mistakes, and useful next steps. Safe to rerun.
ALTER TABLE public.game_results DROP CONSTRAINT IF EXISTS game_results_score_check;
ALTER TABLE public.game_results DROP CONSTRAINT IF EXISTS game_results_total_questions_check;

ALTER TABLE public.game_results
  ADD COLUMN IF NOT EXISTS session_id UUID,
  ADD COLUMN IF NOT EXISTS attempts JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER NOT NULL DEFAULT 0;

UPDATE public.game_results
SET session_id = id,
    started_at = COALESCE(started_at, completed_at)
WHERE session_id IS NULL OR started_at IS NULL;

ALTER TABLE public.game_results ALTER COLUMN session_id SET NOT NULL;
ALTER TABLE public.game_results ALTER COLUMN session_id SET DEFAULT gen_random_uuid();

DO $$ BEGIN
  ALTER TABLE public.game_results ADD CONSTRAINT game_results_session_score_check
    CHECK (score >= 0 AND total_questions >= 1 AND score <= total_questions);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.game_results ADD CONSTRAINT game_results_attempts_array_check
    CHECK (jsonb_typeof(attempts) = 'array');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS game_results_kid_session_idx
  ON public.game_results (kid_id, session_id);
