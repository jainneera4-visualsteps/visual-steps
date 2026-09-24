-- Run after 2026-09-23_activity_temporary_unavailability.sql.
-- Keeps a changed choice separate from completion, recurrence, and its steps.
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS unavailability_kind text,
  ADD COLUMN IF NOT EXISTS unavailability_reason text,
  ADD COLUMN IF NOT EXISTS replacement_activity_id uuid;

ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_unavailability_kind_check;
ALTER TABLE public.activities ADD CONSTRAINT activities_unavailability_kind_check
  CHECK (unavailability_kind IS NULL OR unavailability_kind IN ('temporary', 'cancelled', 'replaced'));

ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_unavailability_reason_length_check;
ALTER TABLE public.activities ADD CONSTRAINT activities_unavailability_reason_length_check
  CHECK (unavailability_reason IS NULL OR char_length(unavailability_reason) <= 180);

ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_replacement_activity_id_fkey;
ALTER TABLE public.activities ADD CONSTRAINT activities_replacement_activity_id_fkey
  FOREIGN KEY (replacement_activity_id) REFERENCES public.activities(id) ON DELETE SET NULL;
