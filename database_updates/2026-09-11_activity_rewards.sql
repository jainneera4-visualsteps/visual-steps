-- Give each activity its own parent-selected reward amount.
-- Existing activities inherit the learner profile's former standard amount.
-- The profile column remains for backward compatibility but is no longer used
-- by the application. Safe to run repeatedly.

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS reward_qty INTEGER;

UPDATE public.activities AS activity
SET reward_qty = GREATEST(1, LEAST(50, COALESCE(kid.reward_quantity, 1)))
FROM public.kids AS kid
WHERE activity.kid_id = kid.id
  AND activity.reward_qty IS NULL;

UPDATE public.activities SET reward_qty = 1 WHERE reward_qty IS NULL;

ALTER TABLE public.activities ALTER COLUMN reward_qty SET DEFAULT 1;
ALTER TABLE public.activities ALTER COLUMN reward_qty SET NOT NULL;
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_reward_qty_check;
ALTER TABLE public.activities ADD CONSTRAINT activities_reward_qty_check
  CHECK (reward_qty BETWEEN 1 AND 50);
