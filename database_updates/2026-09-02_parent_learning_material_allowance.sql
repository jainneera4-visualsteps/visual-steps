-- Shared daily allowance for AI-created quizzes, worksheets, and social stories.
-- The allowance resets at 7:00 AM in the parent's browser timezone.

CREATE TABLE IF NOT EXISTS public.parent_learning_material_usage (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  material_count INTEGER NOT NULL DEFAULT 0 CHECK (material_count >= 0),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE public.parent_learning_material_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parents can view their own learning material usage" ON public.parent_learning_material_usage;
CREATE POLICY "Parents can view their own learning material usage"
  ON public.parent_learning_material_usage FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.consume_parent_learning_material_allowance(
  timezone_param TEXT DEFAULT 'America/New_York'
)
RETURNS TABLE (
  allowed BOOLEAN,
  used INTEGER,
  remaining INTEGER,
  daily_limit INTEGER,
  resets_at TIMESTAMP WITH TIME ZONE,
  usage_date DATE
) AS $$
DECLARE
  requesting_user UUID := auth.uid();
  safe_timezone TEXT := COALESCE(NULLIF(btrim(timezone_param), ''), 'America/New_York');
  local_now TIMESTAMP WITHOUT TIME ZONE;
  current_day DATE;
  current_count INTEGER;
  was_consumed BOOLEAN := false;
  limit_value CONSTANT INTEGER := 10;
BEGIN
  IF requesting_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  BEGIN
    local_now := timezone(safe_timezone, now());
  EXCEPTION WHEN invalid_parameter_value THEN
    safe_timezone := 'America/New_York';
    local_now := timezone(safe_timezone, now());
  END;

  current_day := local_now::date;
  IF local_now::time < TIME '07:00' THEN current_day := current_day - 1; END IF;

  INSERT INTO public.parent_learning_material_usage (user_id, usage_date, material_count, updated_at)
  VALUES (requesting_user, current_day, 1, timezone('utc'::text, now()))
  ON CONFLICT ON CONSTRAINT parent_learning_material_usage_pkey DO UPDATE
    SET material_count = public.parent_learning_material_usage.material_count + 1,
        updated_at = timezone('utc'::text, now())
    WHERE public.parent_learning_material_usage.material_count < limit_value
  RETURNING material_count INTO current_count;

  IF current_count IS NOT NULL THEN
    was_consumed := true;
  ELSE
    SELECT material_count INTO current_count
    FROM public.parent_learning_material_usage
    WHERE user_id = requesting_user
      AND parent_learning_material_usage.usage_date = current_day;
  END IF;

  RETURN QUERY SELECT
    was_consumed,
    COALESCE(current_count, 0),
    GREATEST(limit_value - COALESCE(current_count, 0), 0),
    limit_value,
    ((current_day + 1)::date + TIME '07:00') AT TIME ZONE safe_timezone,
    current_day;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.consume_parent_learning_material_allowance(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_parent_learning_material_allowance(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.consume_parent_learning_material_allowance(TEXT) TO authenticated;
