-- Stores the parent-selected emoji for reward names that do not use a built-in icon.
-- Safe to run repeatedly.
ALTER TABLE public.kids
  ADD COLUMN IF NOT EXISTS reward_icon TEXT;

ALTER TABLE public.kids
  DROP CONSTRAINT IF EXISTS kids_reward_icon_length;

ALTER TABLE public.kids
  ADD CONSTRAINT kids_reward_icon_length
  CHECK (reward_icon IS NULL OR char_length(reward_icon) BETWEEN 1 AND 500);
