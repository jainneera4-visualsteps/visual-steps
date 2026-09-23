-- Positive recognition is encouragement in its own right and never changes a
-- learner's token balance. Bonus tokens remain in behavior_bonus_awards.
-- Safe to rerun.
ALTER TABLE public.behavior_bonus_awards
  ADD COLUMN IF NOT EXISTS is_legacy_recognition BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.behavior_bonus_awards
  ALTER COLUMN is_legacy_recognition SET DEFAULT false;

CREATE TABLE IF NOT EXISTS public.positive_recognitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_id UUID NOT NULL REFERENCES public.kids(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recognition_message TEXT NOT NULL CHECK (length(btrim(recognition_message)) BETWEEN 1 AND 160),
  recognized_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS positive_recognitions_kid_date_idx
  ON public.positive_recognitions (kid_id, recognized_at DESC);

ALTER TABLE public.positive_recognitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parents can view their children's positive recognitions" ON public.positive_recognitions;
CREATE POLICY "Parents can view their children's positive recognitions"
  ON public.positive_recognitions FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.record_positive_recognition(
  kid_id_param UUID,
  recognition_message_param TEXT
)
RETURNS TABLE (recognition_id UUID, kid_id UUID, recognition_message TEXT, recognized_at TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
  requesting_user UUID := auth.uid();
  recognition_row public.positive_recognitions%ROWTYPE;
BEGIN
  IF requesting_user IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF NULLIF(btrim(recognition_message_param), '') IS NULL OR length(btrim(recognition_message_param)) > 160 THEN
    RAISE EXCEPTION 'A recognition message is required' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.kids WHERE id = kid_id_param AND user_id = requesting_user) THEN
    RAISE EXCEPTION 'Child not found or not authorized' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.positive_recognitions (kid_id, user_id, recognition_message)
  VALUES (kid_id_param, requesting_user, btrim(recognition_message_param))
  RETURNING * INTO recognition_row;

  RETURN QUERY SELECT recognition_row.id, recognition_row.kid_id,
    recognition_row.recognition_message, recognition_row.recognized_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.record_positive_recognition(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_positive_recognition(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_positive_recognition(UUID, TEXT) TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.positive_recognitions FROM authenticated;
