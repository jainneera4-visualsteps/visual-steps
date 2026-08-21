-- Parent-initiated rewards for observed positive behavior.
-- Children cannot request these bonuses. Every award records why it was given.

DROP FUNCTION IF EXISTS public.resolve_challenge_request(UUID, TEXT, TEXT, INTEGER);
DROP TABLE IF EXISTS public.challenge_requests CASCADE;

ALTER TABLE public.kids
  ADD COLUMN IF NOT EXISTS bonus_history_limit INTEGER NOT NULL DEFAULT 5;
ALTER TABLE public.kids DROP CONSTRAINT IF EXISTS kids_bonus_history_limit_check;
ALTER TABLE public.kids ADD CONSTRAINT kids_bonus_history_limit_check CHECK (bonus_history_limit BETWEEN 1 AND 10);

CREATE TABLE IF NOT EXISTS public.behavior_bonus_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_id UUID NOT NULL REFERENCES public.kids(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  behavior_reason TEXT NOT NULL CHECK (length(btrim(behavior_reason)) BETWEEN 1 AND 160),
  reward_amount INTEGER NOT NULL CHECK (reward_amount BETWEEN 1 AND 10),
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS behavior_bonus_awards_kid_date_idx
  ON public.behavior_bonus_awards(kid_id, awarded_at DESC);

ALTER TABLE public.behavior_bonus_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parents can view their children's behavior bonuses" ON public.behavior_bonus_awards;
CREATE POLICY "Parents can view their children's behavior bonuses"
  ON public.behavior_bonus_awards FOR SELECT USING (auth.uid() = user_id);

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
  IF reward_amount_param IS NULL OR reward_amount_param < 1 OR reward_amount_param > 10 THEN
    RAISE EXCEPTION 'Reward amount must be between 1 and 10' USING ERRCODE = '22023';
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
