-- Keeps a dated, parent-readable audit trail of activity lifecycle decisions.
-- Deleting these rows never deletes or changes the assigned activity. Safe to rerun.
CREATE TABLE IF NOT EXISTS public.activity_action_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kid_id UUID NOT NULL REFERENCES public.kids(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  source_history_id UUID,
  activity_category TEXT,
  activity_name TEXT NOT NULL,
  activity_description TEXT,
  action TEXT NOT NULL,
  action_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT activity_action_history_action_check CHECK (
    action IN ('created', 'submitted', 'verified', 'completed', 'reassigned', 'on_hold', 'ended', 'deleted')
  )
);

ALTER TABLE public.activity_action_history
  ADD COLUMN IF NOT EXISTS activity_category TEXT;

ALTER TABLE public.activity_action_history DROP CONSTRAINT IF EXISTS activity_action_history_action_check;
UPDATE public.activity_action_history SET action = 'created' WHERE action = 'assigned';
ALTER TABLE public.activity_action_history ADD CONSTRAINT activity_action_history_action_check CHECK (
  action IN ('created', 'submitted', 'verified', 'completed', 'reassigned', 'on_hold', 'ended', 'deleted')
);

CREATE INDEX IF NOT EXISTS activity_action_history_kid_date_idx
  ON public.activity_action_history (kid_id, action_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS activity_action_history_source_history_idx
  ON public.activity_action_history (source_history_id)
  WHERE source_history_id IS NOT NULL;

-- Preserve older completed records in the new timeline without reading live
-- activities on the Data page.
INSERT INTO public.activity_action_history (
  user_id, kid_id, source_history_id, activity_category, activity_name, activity_description, action, action_date
)
SELECT k.user_id, h.kid_id, h.id,
       h.category, COALESCE(NULLIF(h.activity_type, ''), 'Activity'), h.description, 'completed',
       COALESCE(h.completion_date::timestamp with time zone, h.created_at, now())
FROM public.activity_history h
JOIN public.kids k ON k.id = h.kid_id
ON CONFLICT DO NOTHING;

UPDATE public.activity_action_history a
SET activity_category = h.category
FROM public.activity_history h
WHERE a.source_history_id = h.id
  AND a.activity_category IS NULL;

CREATE OR REPLACE FUNCTION public.record_activity_action()
RETURNS trigger AS $$
DECLARE
  owner_id UUID;
  action_name TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT user_id INTO owner_id FROM public.kids WHERE id = OLD.kid_id;
  ELSE
    SELECT user_id INTO owner_id FROM public.kids WHERE id = NEW.kid_id;
  END IF;
  IF owner_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    action_name := 'deleted';
  ELSIF TG_OP = 'INSERT' THEN
    action_name := 'created';
  ELSIF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  ELSE
    action_name := CASE
      WHEN NEW.status = 'awaiting_verification' THEN 'submitted'
      WHEN NEW.status = 'completed' AND OLD.status = 'awaiting_verification' THEN 'verified'
      WHEN NEW.status = 'completed' THEN 'completed'
      WHEN NEW.status = 'pending' THEN 'reassigned'
      WHEN NEW.status = 'on_hold' THEN 'on_hold'
      WHEN NEW.status = 'ended' THEN 'ended'
      ELSE NULL
    END;
  END IF;

  IF action_name IS NOT NULL THEN
    INSERT INTO public.activity_action_history (
      user_id, kid_id, activity_id, activity_category, activity_name, activity_description,
      action, action_date, details
    ) VALUES (
      owner_id, CASE WHEN TG_OP = 'DELETE' THEN OLD.kid_id ELSE NEW.kid_id END,
      CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.id END,
      CASE WHEN TG_OP = 'DELETE' THEN OLD.category ELSE NEW.category END,
      COALESCE(NULLIF(CASE WHEN TG_OP = 'DELETE' THEN OLD.activity_type ELSE NEW.activity_type END, ''), 'Activity'),
      CASE WHEN TG_OP = 'DELETE' THEN OLD.description ELSE NEW.description END,
      action_name, now(),
      jsonb_build_object(
        'previous_status', CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN OLD.status ELSE NULL END,
        'new_status', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.status END,
        'reassignment_level', CASE WHEN TG_OP = 'DELETE' THEN OLD.reassignment_level ELSE NEW.reassignment_level END
      )
    );

    -- Verification is both a review decision and the moment the activity is
    -- completed. Preserve both facts so every completion appears in history,
    -- regardless of whether a learner completed it directly or a parent
    -- completed it through verification.
    IF action_name = 'verified' THEN
      INSERT INTO public.activity_action_history (
        user_id, kid_id, activity_id, activity_category, activity_name, activity_description,
        action, action_date, details
      ) VALUES (
        owner_id, NEW.kid_id, NEW.id, NEW.category,
        COALESCE(NULLIF(NEW.activity_type, ''), 'Activity'), NEW.description,
        'completed', now(),
        jsonb_build_object(
          'previous_status', OLD.status,
          'new_status', NEW.status,
          'completed_through_verification', true
        )
      );
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add the corresponding completion event for verification records captured by
-- an earlier version of this migration. The NOT EXISTS condition keeps reruns
-- idempotent.
INSERT INTO public.activity_action_history (
  user_id, kid_id, activity_id, source_history_id, activity_category,
  activity_name, activity_description, action, action_date, details
)
SELECT v.user_id, v.kid_id, v.activity_id, NULL, v.activity_category,
       v.activity_name, v.activity_description, 'completed', v.action_date,
       jsonb_build_object(
         'previous_status', 'awaiting_verification',
         'new_status', 'completed',
         'completed_through_verification', true
       )
FROM public.activity_action_history v
WHERE v.action = 'verified'
  AND NOT EXISTS (
    SELECT 1 FROM public.activity_action_history c
    WHERE c.kid_id = v.kid_id
      AND c.action = 'completed'
      AND c.action_date = v.action_date
      AND c.activity_name = v.activity_name
  );

DROP TRIGGER IF EXISTS record_activity_action_trigger ON public.activities;
CREATE TRIGGER record_activity_action_trigger
AFTER INSERT OR UPDATE OF status ON public.activities
FOR EACH ROW EXECUTE FUNCTION public.record_activity_action();
DROP TRIGGER IF EXISTS record_activity_deletion_trigger ON public.activities;
CREATE TRIGGER record_activity_deletion_trigger
AFTER DELETE ON public.activities
FOR EACH ROW EXECUTE FUNCTION public.record_activity_action();

ALTER TABLE public.activity_action_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parents can view activity action history" ON public.activity_action_history;
CREATE POLICY "Parents can view activity action history"
  ON public.activity_action_history FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Parents can delete activity action history" ON public.activity_action_history;
CREATE POLICY "Parents can delete activity action history"
  ON public.activity_action_history FOR DELETE
  USING (user_id = auth.uid());

REVOKE INSERT, UPDATE ON public.activity_action_history FROM authenticated;
