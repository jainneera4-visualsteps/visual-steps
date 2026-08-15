-- Non-destructive schema alignment for API fields already used by Visual Steps.
-- Safe to run repeatedly in both test and production Supabase projects.

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS repeat_interval INTEGER,
  ADD COLUMN IF NOT EXISTS repeat_unit TEXT;

ALTER TABLE public.reward_items
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE public.reward_purchases
  ADD COLUMN IF NOT EXISTS location TEXT;
