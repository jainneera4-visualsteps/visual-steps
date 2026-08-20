-- Optional parent verification for individual assigned activities.
-- Existing activities keep their current behavior because verification is off
-- by default. Safe to run repeatedly.

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS requires_verification BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Status remains TEXT for compatibility with existing installations. This
-- constraint documents and enforces the supported workflow.
ALTER TABLE public.activities
  DROP CONSTRAINT IF EXISTS activities_status_check;

ALTER TABLE public.activities
  ADD CONSTRAINT activities_status_check
  CHECK (status IN ('pending', 'awaiting_verification', 'completed'));

CREATE INDEX IF NOT EXISTS activities_waiting_for_verification_idx
  ON public.activities(kid_id, submitted_at DESC)
  WHERE status = 'awaiting_verification';

