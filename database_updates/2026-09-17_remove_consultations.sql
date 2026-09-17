-- Permanently removes the retired consultation scheduler and its saved data.
-- Apply this migration only after deploying code that no longer uses the
-- consultation API. Safe to rerun.
BEGIN;

DROP TABLE IF EXISTS public.consultation_bookings;
DROP TABLE IF EXISTS public.consultation_sessions;
DROP TABLE IF EXISTS public.consultation_availability_rules;
DROP TABLE IF EXISTS public.consultation_unavailable_dates;

COMMIT;
