-- Flexible time guidance for activities. Existing activities remain suggested
-- and unrestricted unless a parent explicitly changes them. Safe to rerun.

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS time_guidance TEXT NOT NULL DEFAULT 'suggested',
  ADD COLUMN IF NOT EXISTS exact_time TIME,
  ADD COLUMN IF NOT EXISTS preparation_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS after_time_passes TEXT NOT NULL DEFAULT 'keep_available';
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_time_guidance_check;
ALTER TABLE public.activities ADD CONSTRAINT activities_time_guidance_check
  CHECK (time_guidance IN ('suggested', 'fixed'));
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_preparation_minutes_check;
ALTER TABLE public.activities ADD CONSTRAINT activities_preparation_minutes_check
  CHECK (preparation_minutes BETWEEN 00 AND 1440);
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_after_time_passes_check;
ALTER TABLE public.activities ADD CONSTRAINT activities_after_time_passes_check
  CHECK (after_time_passes IN ('keep_available', 'request_reschedule', 'hide'));

ALTER TABLE public.activity_history
  ADD COLUMN IF NOT EXISTS time_guidance TEXT NOT NULL DEFAULT 'suggested',
  ADD COLUMN IF NOT EXISTS exact_time TIME,
  ADD COLUMN IF NOT EXISTS preparation_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS after_time_passes TEXT NOT NULL DEFAULT 'keep_available';
