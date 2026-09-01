-- Unify learner-chosen additional activities with the existing activity flow.
-- Run after 2026-08-31_optional_bonus_activities.sql. Safe to run repeatedly.

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS is_optional_bonus BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS optional_reward_qty INTEGER,
  ADD COLUMN IF NOT EXISTS optional_selected_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS legacy_optional_activity_id UUID;

ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_optional_reward_qty_check;
ALTER TABLE public.activities ADD CONSTRAINT activities_optional_reward_qty_check
  CHECK (optional_reward_qty IS NULL OR optional_reward_qty BETWEEN 1 AND 50);
CREATE UNIQUE INDEX IF NOT EXISTS activities_legacy_optional_activity_unique
  ON public.activities(legacy_optional_activity_id) WHERE legacy_optional_activity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS activities_optional_daily_idx
  ON public.activities(kid_id, due_date, is_optional_bonus, status);

ALTER TABLE public.activity_history
  ADD COLUMN IF NOT EXISTS is_optional_bonus BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS optional_reward_qty INTEGER;

-- Preserve any definitions created through the first implementation by moving
-- them into the normal activity and activity-step structure. The former tables
-- remain as a read-only legacy record so no previously entered data is lost.
INSERT INTO public.activities (
  kid_id, activity_type, category, repeat_frequency, time_of_day, description,
  image_url, status, requires_verification, due_date, is_optional_bonus,
  optional_reward_qty, legacy_optional_activity_id
)
SELECT activity.kid_id, activity.title, 'Optional', 'Never', 'Any time',
  activity.description, activity.image_url, 'pending', activity.requires_verification,
  current_date, true, activity.reward_amount, activity.id
FROM public.optional_bonus_activities AS activity
WHERE activity.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.activities existing
    WHERE existing.legacy_optional_activity_id = activity.id
  );

INSERT INTO public.activity_steps (activity_id, step_number, description, image_url)
SELECT unified.id, step.ordinality::integer, step.value #>> '{}', NULL
FROM public.optional_bonus_activities AS legacy
JOIN public.activities AS unified ON unified.legacy_optional_activity_id = legacy.id
CROSS JOIN LATERAL jsonb_array_elements(legacy.steps) WITH ORDINALITY AS step(value, ordinality)
WHERE NOT EXISTS (
  SELECT 1 FROM public.activity_steps existing WHERE existing.activity_id = unified.id
);

CREATE OR REPLACE FUNCTION public.select_optional_activity(
  activity_id_param UUID,
  kid_id_param UUID,
  user_id_param UUID,
  activity_date_param DATE
)
RETURNS TABLE (activity_id UUID, selected_at TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
  kid_row public.kids%ROWTYPE;
  activity_row public.activities%ROWTYPE;
  chosen_count INTEGER;
  chosen_rewards INTEGER;
  remaining_rewards INTEGER;
  smallest_reward_above_remaining INTEGER;
  selected_time TIMESTAMP WITH TIME ZONE := now();
BEGIN
  SELECT * INTO kid_row FROM public.kids
  WHERE id = kid_id_param AND user_id = user_id_param FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Learner profile not found' USING ERRCODE = '42501'; END IF;
  IF NOT kid_row.optional_bonus_enabled THEN
    RAISE EXCEPTION 'Additional activities are turned off' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO activity_row FROM public.activities
  WHERE id = activity_id_param AND kid_id = kid_id_param
    AND is_optional_bonus = true AND status = 'pending'
    AND due_date = activity_date_param FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This additional activity is unavailable' USING ERRCODE = '22023'; END IF;
  IF activity_row.optional_selected_at IS NOT NULL THEN
    RAISE EXCEPTION 'This additional activity was already chosen' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.activities
    WHERE kid_id = kid_id_param AND due_date = activity_date_param
      AND is_optional_bonus = false AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Finish today''s assigned activities before choosing an additional activity' USING ERRCODE = '22023';
  END IF;

  SELECT
    (SELECT COUNT(*) FROM public.activities
      WHERE kid_id = kid_id_param AND due_date = activity_date_param
        AND is_optional_bonus = true AND status <> 'completed'
        AND optional_selected_at IS NOT NULL)
      +
    (SELECT COUNT(*) FROM public.activity_history
      WHERE kid_id = kid_id_param AND due_date = activity_date_param
        AND is_optional_bonus = true),
    COALESCE((SELECT SUM(COALESCE(optional_reward_qty, 0)) FROM public.activities
      WHERE kid_id = kid_id_param AND due_date = activity_date_param
        AND is_optional_bonus = true AND status <> 'completed'
        AND optional_selected_at IS NOT NULL), 0)
      +
    COALESCE((SELECT SUM(COALESCE(optional_reward_qty, reward_qty, 0)) FROM public.activity_history
      WHERE kid_id = kid_id_param AND due_date = activity_date_param
        AND is_optional_bonus = true), 0)
  INTO chosen_count, chosen_rewards;

  IF chosen_count >= kid_row.optional_bonus_daily_activity_limit THEN
    RAISE EXCEPTION 'Today''s additional activity limit has been reached' USING ERRCODE = '22023';
  END IF;
  remaining_rewards := kid_row.optional_bonus_daily_reward_limit - chosen_rewards;
  IF remaining_rewards <= 0 THEN
    RAISE EXCEPTION 'Today''s additional reward limit has been reached' USING ERRCODE = '22023';
  END IF;

  -- Keep every activity that fits. If none of a reward tier fits exactly,
  -- also allow the smallest tier above the remaining amount so the learner
  -- can make one final choice and receive that activity's full reward.
  SELECT MIN(COALESCE(optional_reward_qty, 1)) INTO smallest_reward_above_remaining
  FROM public.activities
  WHERE kid_id = kid_id_param AND due_date = activity_date_param
    AND is_optional_bonus = true AND status = 'pending'
    AND optional_selected_at IS NULL
    AND COALESCE(optional_reward_qty, 1) > remaining_rewards;

  IF COALESCE(activity_row.optional_reward_qty, 1) > remaining_rewards
    AND COALESCE(activity_row.optional_reward_qty, 1) <> smallest_reward_above_remaining THEN
    RAISE EXCEPTION 'Choose an available additional activity' USING ERRCODE = '22023';
  END IF;

  UPDATE public.activities SET optional_selected_at = selected_time
  WHERE id = activity_row.id;
  RETURN QUERY SELECT activity_row.id, selected_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.select_optional_activity(UUID, UUID, UUID, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.select_optional_activity(UUID, UUID, UUID, DATE) TO service_role;

-- The original implementation used separate writable tables. Keep their data
-- available for migration/audit, but prevent browser clients from creating a
-- second, competing type of optional activity.
DROP POLICY IF EXISTS "Parents manage their optional bonus activities" ON public.optional_bonus_activities;
DROP POLICY IF EXISTS "Parents view their optional bonus activities" ON public.optional_bonus_activities;
DROP POLICY IF EXISTS "Parents view their legacy optional bonus activities" ON public.optional_bonus_activities;
CREATE POLICY "Parents view their legacy optional bonus activities"
  ON public.optional_bonus_activities FOR SELECT USING (auth.uid() = user_id);

REVOKE ALL ON FUNCTION public.submit_optional_bonus_activity(UUID, UUID, UUID, DATE) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.review_optional_bonus_completion(UUID, UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
