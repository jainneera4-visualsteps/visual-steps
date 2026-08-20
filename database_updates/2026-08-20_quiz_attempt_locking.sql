-- Lock each assigned quiz occurrence after its first submitted attempt.
-- Reassigning the same activity increments attempt_generation, preserving old
-- results while allowing one fresh attempt. Safe to run repeatedly.

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS attempt_generation INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.quiz_results
  ADD COLUMN IF NOT EXISTS activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attempt_generation INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS quiz_results_assignment_attempt_unique
  ON public.quiz_results(activity_id, attempt_generation)
  WHERE activity_id IS NOT NULL AND attempt_generation IS NOT NULL;

CREATE INDEX IF NOT EXISTS quiz_results_activity_id_idx
  ON public.quiz_results(activity_id);
