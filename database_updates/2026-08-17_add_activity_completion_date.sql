-- Record completion on each assigned activity occurrence.
-- Safe to run repeatedly in both production and local/test Supabase projects.

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS completion_date TIMESTAMP WITH TIME ZONE;

-- Existing completed assignments can be matched to their history record by
-- child, due date, and activity details. This preserves the most recent known
-- completion time without changing or deleting history.
UPDATE public.activities AS activity
SET completion_date = (
  SELECT CASE
    -- Preserve an existing timezone when history already uses timestamptz (or
    -- its text contains an explicit UTC/offset suffix).
    WHEN history.completion_date::TEXT ~ '(Z|[+-]\d{2}(:\d{2})?)$'
      THEN history.completion_date::TEXT::TIMESTAMP WITH TIME ZONE
    -- Older databases stored a timezone-free local timestamp as TEXT.
    ELSE history.completion_date::TEXT::TIMESTAMP
      AT TIME ZONE COALESCE(kid.timezone, 'UTC')
  END AS completion_date
  FROM public.activity_history AS history
  JOIN public.kids AS kid ON kid.id = history.kid_id
  WHERE history.kid_id = activity.kid_id
    AND history.due_date IS NOT DISTINCT FROM activity.due_date
    AND history.activity_type IS NOT DISTINCT FROM activity.activity_type
    AND history.description IS NOT DISTINCT FROM activity.description
    AND history.completion_date IS NOT NULL
    AND history.completion_date::TEXT ~ '^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}'
  ORDER BY history.completion_date DESC
  LIMIT 1
)
WHERE activity.status = 'completed'
  AND activity.completion_date IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.activity_history AS history
    WHERE history.kid_id = activity.kid_id
      AND history.due_date IS NOT DISTINCT FROM activity.due_date
      AND history.activity_type IS NOT DISTINCT FROM activity.activity_type
      AND history.description IS NOT DISTINCT FROM activity.description
      AND history.completion_date IS NOT NULL
      AND history.completion_date::TEXT ~ '^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}'
  );
