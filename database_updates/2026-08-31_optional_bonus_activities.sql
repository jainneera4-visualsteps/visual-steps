-- Learner-chosen bonus activities shown only after today's required plan is done.
-- These records remain separate from assigned activities and behavior bonuses.

ALTER TABLE public.kids
  ADD COLUMN IF NOT EXISTS optional_bonus_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS optional_bonus_daily_activity_limit INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS optional_bonus_daily_reward_limit INTEGER NOT NULL DEFAULT 10;

ALTER TABLE public.kids DROP CONSTRAINT IF EXISTS kids_optional_bonus_activity_limit_check;
ALTER TABLE public.kids ADD CONSTRAINT kids_optional_bonus_activity_limit_check
  CHECK (optional_bonus_daily_activity_limit BETWEEN 1 AND 10);
ALTER TABLE public.kids DROP CONSTRAINT IF EXISTS kids_optional_bonus_reward_limit_check;
ALTER TABLE public.kids ADD CONSTRAINT kids_optional_bonus_reward_limit_check
  CHECK (optional_bonus_daily_reward_limit BETWEEN 1 AND 100);

CREATE TABLE IF NOT EXISTS public.optional_bonus_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_id UUID NOT NULL REFERENCES public.kids(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 120),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 1000),
  reward_amount INTEGER NOT NULL CHECK (reward_amount BETWEEN 1 AND 50),
  estimated_minutes INTEGER CHECK (estimated_minutes IS NULL OR estimated_minutes BETWEEN 1 AND 240),
  requires_verification BOOLEAN NOT NULL DEFAULT true,
  available_days SMALLINT[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6]::SMALLINT[],
  image_url TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.optional_bonus_activity_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  optional_activity_id UUID REFERENCES public.optional_bonus_activities(id) ON DELETE SET NULL,
  activity_title TEXT NOT NULL,
  kid_id UUID NOT NULL REFERENCES public.kids(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  reward_amount INTEGER NOT NULL CHECK (reward_amount BETWEEN 1 AND 50),
  status TEXT NOT NULL CHECK (status IN ('awaiting_verification', 'completed', 'not_approved')),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (optional_activity_id, kid_id, activity_date)
);

-- Preserve a readable completion history if a parent later removes an item
-- from the optional-activity library.
ALTER TABLE public.optional_bonus_activity_completions
  ADD COLUMN IF NOT EXISTS activity_title TEXT;
UPDATE public.optional_bonus_activity_completions AS completion
SET activity_title = COALESCE(activity.title, 'Optional activity')
FROM public.optional_bonus_activities AS activity
WHERE completion.optional_activity_id = activity.id
  AND completion.activity_title IS NULL;
UPDATE public.optional_bonus_activity_completions
SET activity_title = 'Optional activity' WHERE activity_title IS NULL;
ALTER TABLE public.optional_bonus_activity_completions
  ALTER COLUMN activity_title SET NOT NULL,
  ALTER COLUMN optional_activity_id DROP NOT NULL;
ALTER TABLE public.optional_bonus_activity_completions
  DROP CONSTRAINT IF EXISTS optional_bonus_activity_completions_optional_activity_id_fkey;
ALTER TABLE public.optional_bonus_activity_completions
  ADD CONSTRAINT optional_bonus_activity_completions_optional_activity_id_fkey
  FOREIGN KEY (optional_activity_id) REFERENCES public.optional_bonus_activities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS optional_bonus_activities_kid_active_idx
  ON public.optional_bonus_activities(kid_id, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS optional_bonus_completions_kid_date_idx
  ON public.optional_bonus_activity_completions(kid_id, activity_date DESC, submitted_at DESC);
CREATE INDEX IF NOT EXISTS optional_bonus_completions_waiting_idx
  ON public.optional_bonus_activity_completions(user_id, status, submitted_at DESC)
  WHERE status = 'awaiting_verification';

ALTER TABLE public.optional_bonus_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optional_bonus_activity_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parents manage their optional bonus activities" ON public.optional_bonus_activities;
CREATE POLICY "Parents manage their optional bonus activities"
  ON public.optional_bonus_activities FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Parents view optional bonus completions" ON public.optional_bonus_activity_completions;
CREATE POLICY "Parents view optional bonus completions"
  ON public.optional_bonus_activity_completions FOR SELECT USING (auth.uid() = user_id);

-- Submission is atomic so simultaneous requests cannot bypass daily limits or
-- award the same optional activity twice on one day. The protected server
-- verifies the learner session and dashboard time before calling this function.
CREATE OR REPLACE FUNCTION public.submit_optional_bonus_activity(
  optional_activity_id_param UUID,
  kid_id_param UUID,
  user_id_param UUID,
  activity_date_param DATE
)
RETURNS TABLE (completion_id UUID, completion_status TEXT, reward_awarded INTEGER) AS $$
DECLARE
  activity_row public.optional_bonus_activities%ROWTYPE;
  kid_row public.kids%ROWTYPE;
  completion_row public.optional_bonus_activity_completions%ROWTYPE;
  completed_count INTEGER;
  awarded_total INTEGER;
  required_count INTEGER;
  unfinished_count INTEGER;
BEGIN
  SELECT * INTO kid_row FROM public.kids WHERE id = kid_id_param AND user_id = user_id_param FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Child profile not found' USING ERRCODE = '42501'; END IF;
  IF NOT kid_row.optional_bonus_enabled THEN RAISE EXCEPTION 'Optional bonus activities are turned off' USING ERRCODE = '22023'; END IF;

  SELECT * INTO activity_row FROM public.optional_bonus_activities
  WHERE id = optional_activity_id_param AND kid_id = kid_id_param AND user_id = user_id_param AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Optional bonus activity is unavailable' USING ERRCODE = '22023'; END IF;
  IF NOT (extract(dow FROM activity_date_param)::SMALLINT = ANY(activity_row.available_days)) THEN
    RAISE EXCEPTION 'This optional activity is not available today' USING ERRCODE = '22023';
  END IF;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'pending')
    INTO required_count, unfinished_count
  FROM public.activities
  WHERE kid_id = kid_id_param AND due_date = activity_date_param
    AND status IN ('pending', 'awaiting_verification', 'completed');
  IF required_count = 0 OR unfinished_count > 0 THEN
    RAISE EXCEPTION 'Finish today''s required activities first' USING ERRCODE = '22023';
  END IF;

  SELECT COUNT(*), COALESCE(SUM(reward_amount) FILTER (WHERE status IN ('awaiting_verification', 'completed')), 0)
    INTO completed_count, awarded_total
  FROM public.optional_bonus_activity_completions
  WHERE kid_id = kid_id_param AND activity_date = activity_date_param
    AND status IN ('awaiting_verification', 'completed');

  IF completed_count >= kid_row.optional_bonus_daily_activity_limit THEN
    RAISE EXCEPTION 'Today''s optional activity limit has been reached' USING ERRCODE = '22023';
  END IF;
  IF awarded_total + activity_row.reward_amount > kid_row.optional_bonus_daily_reward_limit THEN
    RAISE EXCEPTION 'Today''s optional reward limit would be exceeded' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.optional_bonus_activity_completions
    (optional_activity_id, activity_title, kid_id, user_id, activity_date, reward_amount, status, reviewed_at)
  VALUES
    (activity_row.id, activity_row.title, kid_id_param, user_id_param, activity_date_param, activity_row.reward_amount,
     CASE WHEN activity_row.requires_verification THEN 'awaiting_verification' ELSE 'completed' END,
     CASE WHEN activity_row.requires_verification THEN NULL ELSE now() END)
  RETURNING * INTO completion_row;

  IF completion_row.status = 'completed' THEN
    UPDATE public.kids SET reward_balance = COALESCE(reward_balance, 0) + completion_row.reward_amount
    WHERE id = kid_id_param;
  END IF;

  RETURN QUERY SELECT completion_row.id, completion_row.status,
    CASE WHEN completion_row.status = 'completed' THEN completion_row.reward_amount ELSE 0 END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.review_optional_bonus_completion(
  completion_id_param UUID,
  user_id_param UUID,
  approve_param BOOLEAN
)
RETURNS TABLE (completion_id UUID, completion_status TEXT, reward_awarded INTEGER) AS $$
DECLARE
  completion_row public.optional_bonus_activity_completions%ROWTYPE;
BEGIN
  SELECT * INTO completion_row FROM public.optional_bonus_activity_completions
  WHERE id = completion_id_param AND user_id = user_id_param FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Optional activity submission not found' USING ERRCODE = '42501'; END IF;
  IF completion_row.status <> 'awaiting_verification' THEN
    RAISE EXCEPTION 'This optional activity was already reviewed' USING ERRCODE = '22023';
  END IF;

  UPDATE public.optional_bonus_activity_completions
  SET status = CASE WHEN approve_param THEN 'completed' ELSE 'not_approved' END, reviewed_at = now()
  WHERE id = completion_row.id
  RETURNING * INTO completion_row;

  IF approve_param THEN
    UPDATE public.kids SET reward_balance = COALESCE(reward_balance, 0) + completion_row.reward_amount
    WHERE id = completion_row.kid_id;
  END IF;

  RETURN QUERY SELECT completion_row.id, completion_row.status,
    CASE WHEN approve_param THEN completion_row.reward_amount ELSE 0 END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.submit_optional_bonus_activity(UUID, UUID, UUID, DATE) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.review_optional_bonus_completion(UUID, UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_optional_bonus_activity(UUID, UUID, UUID, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION public.review_optional_bonus_completion(UUID, UUID, BOOLEAN) TO service_role;
