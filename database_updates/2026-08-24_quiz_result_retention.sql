-- Allow parents to delete detailed quiz results without reopening a submitted
-- assignment. Safe to run repeatedly after quiz-attempt locking is installed.

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS last_quiz_attempt_generation INTEGER;

UPDATE public.activities AS activity
SET last_quiz_attempt_generation = latest.attempt_generation
FROM (
  SELECT activity_id, MAX(attempt_generation) AS attempt_generation
  FROM public.quiz_results
  WHERE activity_id IS NOT NULL AND attempt_generation IS NOT NULL
  GROUP BY activity_id
) AS latest
WHERE activity.id = latest.activity_id
  AND activity.last_quiz_attempt_generation IS NULL;

CREATE OR REPLACE FUNCTION public.remember_quiz_attempt_submission()
RETURNS trigger AS $$
BEGIN
  IF NEW.activity_id IS NOT NULL AND NEW.attempt_generation IS NOT NULL THEN
    UPDATE public.activities
    SET last_quiz_attempt_generation = NEW.attempt_generation
    WHERE id = NEW.activity_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS remember_quiz_attempt_submission_trigger ON public.quiz_results;
CREATE TRIGGER remember_quiz_attempt_submission_trigger
AFTER INSERT ON public.quiz_results
FOR EACH ROW EXECUTE FUNCTION public.remember_quiz_attempt_submission();
