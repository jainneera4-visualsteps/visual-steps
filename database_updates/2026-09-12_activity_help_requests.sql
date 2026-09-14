-- Stage 2A: learner help requests for activities.
-- Help is stored separately from completion so it never changes rewards,
-- recurrence, history, or the activity's current status. Safe to rerun.

CREATE TABLE IF NOT EXISTS public.activity_help_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  kid_id UUID NOT NULL REFERENCES public.kids(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  resolution TEXT CHECK (resolution IS NULL OR resolution IN ('helped', 'ready_again', 'put_on_hold')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS activity_help_requests_one_open_per_activity_idx
  ON public.activity_help_requests(activity_id)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS activity_help_requests_kid_status_idx
  ON public.activity_help_requests(kid_id, status, requested_at DESC);

ALTER TABLE public.activity_help_requests ENABLE ROW LEVEL SECURITY;

-- Browser clients use ownership-checked server routes. Keeping the table
-- service-role only prevents a learner from reading another learner's request.
REVOKE ALL ON TABLE public.activity_help_requests FROM anon, authenticated;
