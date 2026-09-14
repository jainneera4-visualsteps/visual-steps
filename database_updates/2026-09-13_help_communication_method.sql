-- How the learner is prompted to ask a nearby parent or caregiver for help.
-- Safe to run repeatedly.
ALTER TABLE public.kids
  ADD COLUMN IF NOT EXISTS help_communication_method TEXT NOT NULL DEFAULT 'spoken',
  ADD COLUMN IF NOT EXISTS help_prompt_text TEXT NOT NULL DEFAULT 'Help please',
  ADD COLUMN IF NOT EXISTS help_prompt_audio_url TEXT,
  ADD COLUMN IF NOT EXISTS help_sign_image_url TEXT,
  ADD COLUMN IF NOT EXISTS help_card_image_url TEXT;

ALTER TABLE public.kids
  DROP CONSTRAINT IF EXISTS kids_help_communication_method_check;

ALTER TABLE public.kids
  ADD CONSTRAINT kids_help_communication_method_check
  CHECK (help_communication_method IN ('spoken', 'sign', 'card'));

ALTER TABLE public.kids
  DROP CONSTRAINT IF EXISTS kids_help_prompt_text_length;

ALTER TABLE public.kids
  ADD CONSTRAINT kids_help_prompt_text_length
  CHECK (char_length(help_prompt_text) BETWEEN 1 AND 120);

-- The existing family upload bucket originally accepted images only. Help
-- phrase recordings share the same ownership rules and five-megabyte limit.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-wav'
]
WHERE id = 'visual-steps-uploads';
