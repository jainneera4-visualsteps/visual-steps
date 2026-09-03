-- A parent-selected learning-game companion for each child / adult profile.
-- Safe to run repeatedly.

ALTER TABLE public.kids
  ADD COLUMN IF NOT EXISTS game_companion TEXT;

-- Repair older rows, including rows created before this setting existed.
UPDATE public.kids
SET game_companion = 'robot'
WHERE game_companion IS NULL
   OR game_companion NOT IN ('robot', 'fox', 'owl', 'dinosaur');

ALTER TABLE public.kids
  ALTER COLUMN game_companion SET DEFAULT 'robot',
  ALTER COLUMN game_companion SET NOT NULL;

ALTER TABLE public.kids DROP CONSTRAINT IF EXISTS kids_game_companion_check;
ALTER TABLE public.kids ADD CONSTRAINT kids_game_companion_check
  CHECK (game_companion IN ('robot', 'fox', 'owl', 'dinosaur'));
