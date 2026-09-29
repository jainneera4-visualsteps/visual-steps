-- Parent-selected place used to filter rewards; NULL shows only rewards without a location.
ALTER TABLE public.kids
ADD COLUMN IF NOT EXISTS current_reward_location TEXT;
