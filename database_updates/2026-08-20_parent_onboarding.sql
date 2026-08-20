-- Remember whether a parent has dismissed or completed the welcome tour.
-- Existing parents are marked complete so they are not interrupted; they can
-- still replay the tour from the dashboard. New profiles start incomplete.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

UPDATE public.users
SET onboarding_completed = true
WHERE onboarding_completed = false
  AND created_at < TIMESTAMP WITH TIME ZONE '2026-08-20 19:22:17+00';
