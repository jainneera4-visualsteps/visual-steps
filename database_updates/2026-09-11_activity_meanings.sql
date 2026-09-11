-- Prepare activities for a flexible choice-based learner experience.
-- This migration does not change the current child dashboard behavior.
-- Safe to run repeatedly.

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS activity_meaning TEXT NOT NULL DEFAULT 'available_choice';

ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_activity_meaning_check;
ALTER TABLE public.activities ADD CONSTRAINT activities_activity_meaning_check
  CHECK (activity_meaning IN ('available_choice', 'important_today'));

UPDATE public.activities
SET activity_meaning = 'available_choice'
WHERE activity_meaning IS NULL
   OR activity_meaning NOT IN ('available_choice', 'important_today');
CREATE INDEX IF NOT EXISTS activities_kid_meaning_status_idx
  ON public.activities(kid_id, activity_meaning, status);

ALTER TABLE public.activity_history
  ADD COLUMN IF NOT EXISTS activity_meaning TEXT NOT NULL DEFAULT 'available_choice';

ALTER TABLE public.activity_history DROP CONSTRAINT IF EXISTS activity_history_activity_meaning_check;
ALTER TABLE public.activity_history ADD CONSTRAINT activity_history_activity_meaning_check
  CHECK (activity_meaning IN ('available_choice', 'important_today'));

UPDATE public.activity_history
SET activity_meaning = 'available_choice'
WHERE activity_meaning IS NULL
   OR activity_meaning NOT IN ('available_choice', 'important_today');
