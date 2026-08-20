-- Reliable per-parent AI spending control. Each successful allowance claim is
-- atomic, so concurrent requests and separate Vercel instances share one cap.

CREATE TABLE IF NOT EXISTS public.parent_ai_usage (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  question_count INTEGER NOT NULL DEFAULT 0 CHECK (question_count >= 0),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE public.parent_ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parents can view their own AI usage" ON public.parent_ai_usage;
CREATE POLICY "Parents can view their own AI usage"
  ON public.parent_ai_usage FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.consume_parent_ai_question()
RETURNS TABLE (
  allowed BOOLEAN,
  used INTEGER,
  remaining INTEGER,
  daily_limit INTEGER,
  resets_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  requesting_user UUID := auth.uid();
  current_day DATE := (timezone('utc'::text, now()))::date;
  current_count INTEGER;
  was_consumed BOOLEAN := false;
  limit_value CONSTANT INTEGER := 30;
BEGIN
  IF requesting_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.parent_ai_usage (user_id, usage_date, question_count, updated_at)
  VALUES (requesting_user, current_day, 1, timezone('utc'::text, now()))
  ON CONFLICT (user_id, usage_date) DO UPDATE
    SET question_count = public.parent_ai_usage.question_count + 1,
        updated_at = timezone('utc'::text, now())
    WHERE public.parent_ai_usage.question_count < limit_value
  RETURNING question_count INTO current_count;

  IF current_count IS NOT NULL THEN
    was_consumed := true;
  ELSE
    SELECT question_count INTO current_count
    FROM public.parent_ai_usage
    WHERE user_id = requesting_user AND usage_date = current_day;
  END IF;

  RETURN QUERY SELECT
    was_consumed,
    COALESCE(current_count, 0),
    GREATEST(limit_value - COALESCE(current_count, 0), 0),
    limit_value,
    ((current_day + 1)::timestamp AT TIME ZONE 'UTC');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.consume_parent_ai_question() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_parent_ai_question() FROM anon;
GRANT EXECUTE ON FUNCTION public.consume_parent_ai_question() TO authenticated;
