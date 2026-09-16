-- Lets a parent or caregiver choose any positive whole-number recognition
-- amount instead of enforcing the earlier 10-reward ceiling. Safe to rerun.
CREATE OR REPLACE FUNCTION public.award_behavior_bonus(
  kid_id_param UUID,
  behavior_reason_param TEXT,
  reward_amount_param INTEGER
)
RETURNS TABLE (award_id UUID, kid_id UUID, behavior_reason TEXT, reward_amount INTEGER, awarded_at TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
  requesting_user UUID := auth.uid();
  award_row public.behavior_bonus_awards%ROWTYPE;
BEGIN
  IF requesting_user IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF NULLIF(btrim(behavior_reason_param), '') IS NULL OR length(btrim(behavior_reason_param)) > 160 THEN
    RAISE EXCEPTION 'A positive behavior reason is required' USING ERRCODE = '22023';
  END IF;
  IF reward_amount_param IS NULL OR reward_amount_param < 1 THEN
    RAISE EXCEPTION 'Reward amount must be a positive whole number' USING ERRCODE = '22023';
  END IF;

  UPDATE public.kids SET reward_balance = COALESCE(reward_balance, 0) + reward_amount_param
  WHERE id = kid_id_param AND user_id = requesting_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'Child not found or not authorized' USING ERRCODE = '42501'; END IF;

  INSERT INTO public.behavior_bonus_awards (kid_id, user_id, behavior_reason, reward_amount)
  VALUES (kid_id_param, requesting_user, btrim(behavior_reason_param), reward_amount_param)
  RETURNING * INTO award_row;

  RETURN QUERY SELECT award_row.id, award_row.kid_id, award_row.behavior_reason, award_row.reward_amount, award_row.awarded_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.award_behavior_bonus(UUID, TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.award_behavior_bonus(UUID, TEXT, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.award_behavior_bonus(UUID, TEXT, INTEGER) TO authenticated;
