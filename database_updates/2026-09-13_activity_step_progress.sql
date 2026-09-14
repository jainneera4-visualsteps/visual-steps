-- Persistent learner progress through the visual steps of an assigned activity.
-- Each repeated/reassigned activity starts with fresh step progress. Safe to rerun.
ALTER TABLE public.activity_steps
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Preserve the learner's actual checked/unchecked record after an activity is
-- archived into completion history for parent review.
ALTER TABLE public.activity_history_steps
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.activity_help_requests
  ADD COLUMN IF NOT EXISTS current_step_number INTEGER;

ALTER TABLE public.activity_help_requests
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS responded_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.activity_help_requests
  DROP CONSTRAINT IF EXISTS activity_help_requests_status_check;

ALTER TABLE public.activity_help_requests
  ADD CONSTRAINT activity_help_requests_status_check
  CHECK (status IN ('open', 'acknowledged', 'resolved'));

ALTER TABLE public.activity_help_requests
  DROP CONSTRAINT IF EXISTS activity_help_requests_current_step_positive;

ALTER TABLE public.activity_help_requests
  ADD CONSTRAINT activity_help_requests_current_step_positive
  CHECK (current_step_number IS NULL OR current_step_number > 0);

CREATE INDEX IF NOT EXISTS activity_steps_activity_completion_idx
  ON public.activity_steps(activity_id, is_completed, step_number);

DROP INDEX IF EXISTS public.activity_help_requests_one_open_per_activity_idx;
CREATE UNIQUE INDEX activity_help_requests_one_open_per_activity_idx
  ON public.activity_help_requests(activity_id)
  WHERE status IN ('open', 'acknowledged');
