-- Run after the other 2026-09-23 activity migrations, before deploying code.
-- An unchosen occurrence retains its date and steps for parent review.
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS not_chosen_reason text,
  ADD COLUMN IF NOT EXISTS not_chosen_at timestamptz;

ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_status_check;
ALTER TABLE public.activities ADD CONSTRAINT activities_status_check
  CHECK (status IN ('pending', 'awaiting_verification', 'completed', 'on_hold', 'ended', 'not_chosen'));

ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_not_chosen_reason_check;
ALTER TABLE public.activities ADD CONSTRAINT activities_not_chosen_reason_check
  CHECK (not_chosen_reason IS NULL OR not_chosen_reason IN
    ('day_ended', 'date_passed', 'temporarily_unavailable', 'cancelled', 'replaced'));

CREATE INDEX IF NOT EXISTS activities_not_chosen_idx
  ON public.activities(kid_id, due_date DESC) WHERE status = 'not_chosen';
