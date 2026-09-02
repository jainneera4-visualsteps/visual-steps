-- Provider-independent private and group consultation scheduling.
-- Public browser clients use protected server routes; tables remain service-role only.
-- Safe to run repeatedly.

CREATE TABLE IF NOT EXISTS public.consultation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_type TEXT NOT NULL CHECK (session_type IN ('private', 'group')),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 3 AND 150),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 2000),
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity BETWEEN 1 AND 50),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'full', 'completed', 'cancelled')),
  meeting_provider TEXT CHECK (meeting_provider IS NULL OR meeting_provider IN ('google_meet', 'microsoft_teams', 'zoom', 'phone', 'other')),
  meeting_link TEXT CHECK (meeting_link IS NULL OR length(meeting_link) <= 1000),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  CHECK (ends_at > starts_at),
  CHECK ((session_type = 'private' AND capacity = 1) OR session_type = 'group')
);

CREATE TABLE IF NOT EXISTS public.consultation_availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 3 AND 150),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 2000),
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  timezone TEXT NOT NULL DEFAULT 'America/New_York' CHECK (length(timezone) BETWEEN 1 AND 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.consultation_availability_rules
  ADD COLUMN IF NOT EXISTS end_time TIME;
UPDATE public.consultation_availability_rules
SET end_time = start_time + (duration_minutes || ' minutes')::interval
WHERE end_time IS NULL;
ALTER TABLE public.consultation_availability_rules ALTER COLUMN end_time SET NOT NULL;
ALTER TABLE public.consultation_availability_rules DROP CONSTRAINT IF EXISTS consultation_availability_rules_duration_minutes_check;
ALTER TABLE public.consultation_availability_rules ADD CONSTRAINT consultation_availability_rules_duration_minutes_check
  CHECK (duration_minutes BETWEEN 15 AND 180);
ALTER TABLE public.consultation_availability_rules DROP CONSTRAINT IF EXISTS consultation_availability_rules_time_window_check;
ALTER TABLE public.consultation_availability_rules ADD CONSTRAINT consultation_availability_rules_time_window_check
  CHECK (end_time > start_time AND end_time >= start_time + (duration_minutes || ' minutes')::interval);

ALTER TABLE public.consultation_sessions
  ADD COLUMN IF NOT EXISTS availability_rule_id UUID REFERENCES public.consultation_availability_rules(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.consultation_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.consultation_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  parent_name TEXT NOT NULL CHECK (length(parent_name) BETWEEN 2 AND 100),
  parent_email TEXT NOT NULL CHECK (length(parent_email) BETWEEN 3 AND 254),
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 10 AND 2000),
  accessibility_request TEXT NOT NULL DEFAULT '' CHECK (length(accessibility_request) <= 1000),
  parent_timezone TEXT NOT NULL DEFAULT 'America/New_York' CHECK (length(parent_timezone) BETWEEN 1 AND 100),
  group_privacy_acknowledged BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'requested', 'confirmed', 'completed', 'cancelled', 'no_show')),
  confirmation_token_hash TEXT,
  confirmation_expires_at TIMESTAMP WITH TIME ZONE,
  email_verified_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT CHECK (admin_notes IS NULL OR length(admin_notes) <= 3000),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.consultation_unavailable_dates (
  unavailable_date DATE PRIMARY KEY,
  reason TEXT NOT NULL DEFAULT '' CHECK (length(reason) <= 500),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS consultation_sessions_public_idx
  ON public.consultation_sessions(session_type, status, starts_at);
CREATE INDEX IF NOT EXISTS consultation_bookings_session_status_idx
  ON public.consultation_bookings(session_id, status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS consultation_bookings_confirmation_token_unique
  ON public.consultation_bookings(confirmation_token_hash)
  WHERE confirmation_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS consultation_availability_rules_active_idx
  ON public.consultation_availability_rules(is_active, weekday, start_time);

ALTER TABLE public.consultation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_unavailable_dates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.consultation_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE public.consultation_bookings FROM anon, authenticated;
REVOKE ALL ON TABLE public.consultation_availability_rules FROM anon, authenticated;
REVOKE ALL ON TABLE public.consultation_unavailable_dates FROM anon, authenticated;
