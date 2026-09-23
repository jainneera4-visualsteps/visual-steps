-- Extend the existing retained message history into a parent/learner conversation.
-- Existing messages remain parent messages. Safe to rerun.
ALTER TABLE public.parent_messages
  ADD COLUMN IF NOT EXISTS sender TEXT NOT NULL DEFAULT 'parent',
  ADD COLUMN IF NOT EXISTS audio_url TEXT,
  ADD COLUMN IF NOT EXISTS parent_read_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.parent_messages
  DROP CONSTRAINT IF EXISTS parent_messages_sender_check;
ALTER TABLE public.parent_messages
  ADD CONSTRAINT parent_messages_sender_check CHECK (sender IN ('parent', 'learner'));

CREATE INDEX IF NOT EXISTS parent_messages_unread_replies_idx
  ON public.parent_messages (user_id, kid_id, created_at DESC)
  WHERE sender = 'learner' AND parent_read_at IS NULL;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS learner_reply_email_notifications BOOLEAN NOT NULL DEFAULT false;
