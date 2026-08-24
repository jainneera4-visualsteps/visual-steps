-- Store measurable quiz objectives and cap paid illustration generation.
-- Safe to run repeatedly in the production Supabase project.

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS learning_objective TEXT;

CREATE TABLE IF NOT EXISTS public.parent_image_usage (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  image_count INTEGER NOT NULL DEFAULT 0 CHECK (image_count >= 0),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE public.parent_image_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parents can view their own illustration usage" ON public.parent_image_usage;
CREATE POLICY "Parents can view their own illustration usage"
  ON public.parent_image_usage FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.consume_parent_image_allowance()
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
  limit_value CONSTANT INTEGER := 10;
BEGIN
  IF requesting_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.parent_image_usage (user_id, usage_date, image_count, updated_at)
  VALUES (requesting_user, current_day, 1, timezone('utc'::text, now()))
  ON CONFLICT (user_id, usage_date) DO UPDATE
    SET image_count = public.parent_image_usage.image_count + 1,
        updated_at = timezone('utc'::text, now())
    WHERE public.parent_image_usage.image_count < limit_value
  RETURNING image_count INTO current_count;

  IF current_count IS NOT NULL THEN
    was_consumed := true;
  ELSE
    SELECT image_count INTO current_count
    FROM public.parent_image_usage
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

REVOKE ALL ON FUNCTION public.consume_parent_image_allowance() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_parent_image_allowance() FROM anon;
GRANT EXECUTE ON FUNCTION public.consume_parent_image_allowance() TO authenticated;
