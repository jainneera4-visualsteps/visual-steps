-- Send the welcome message only after a parent has verified the email address
-- and signed in. Existing accounts are marked as already handled so this
-- change does not unexpectedly email established families.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMP WITH TIME ZONE;

UPDATE public.users
SET welcome_email_sent_at = COALESCE(welcome_email_sent_at, timezone('utc'::text, now()));
