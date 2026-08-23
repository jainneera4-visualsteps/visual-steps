-- Explicit parent decisions for completed, held, and ended activities.
-- A same-level reassignment counts as a repeated activity; moving the level up
-- or down starts another attempt without classifying it as a repeat.

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS reassignment_level TEXT,
  ADD COLUMN IF NOT EXISTS repeat_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.activities
  DROP CONSTRAINT IF EXISTS activities_reassignment_level_check;
ALTER TABLE public.activities
  ADD CONSTRAINT activities_reassignment_level_check
  CHECK (reassignment_level IS NULL OR reassignment_level IN ('same', 'up', 'down'));

ALTER TABLE public.activities
  DROP CONSTRAINT IF EXISTS activities_repeat_count_check;
ALTER TABLE public.activities
  ADD CONSTRAINT activities_repeat_count_check CHECK (repeat_count >= 0);

-- Preserve previously recorded reassignments as same-level repeats. Future
-- updates use the parent's explicit level selection.
UPDATE public.activities
SET repeat_count = GREATEST(COALESCE(attempt_generation, 1) - 1, 0)
WHERE repeat_count = 0 AND COALESCE(attempt_generation, 1) > 1;

ALTER TABLE public.activities
  DROP CONSTRAINT IF EXISTS activities_status_check;
ALTER TABLE public.activities
  ADD CONSTRAINT activities_status_check
  CHECK (status IN ('pending', 'awaiting_verification', 'completed', 'on_hold', 'ended'));

CREATE INDEX IF NOT EXISTS activities_on_hold_idx
  ON public.activities(kid_id, due_date DESC) WHERE status = 'on_hold';
CREATE INDEX IF NOT EXISTS activities_ended_idx
  ON public.activities(kid_id, due_date DESC) WHERE status = 'ended';
