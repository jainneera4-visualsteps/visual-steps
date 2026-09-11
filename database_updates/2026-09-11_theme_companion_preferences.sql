-- Parent-controlled presentation for the learner dashboard theme companion.
-- Existing profiles keep the friendly character by default. Safe to rerun.

ALTER TABLE public.kids
  ADD COLUMN IF NOT EXISTS theme_companion_style TEXT NOT NULL DEFAULT 'character';

ALTER TABLE public.kids DROP CONSTRAINT IF EXISTS kids_theme_companion_style_check;
ALTER TABLE public.kids ADD CONSTRAINT kids_theme_companion_style_check
  CHECK (theme_companion_style IN ('character', 'simple', 'none'));
