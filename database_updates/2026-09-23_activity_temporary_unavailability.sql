-- Parent-controlled availability is independent of completion and scheduling.
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS unavailable_for_now boolean NOT NULL DEFAULT false;
