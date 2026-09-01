-- Contact-page messages available to approved Visual Steps administrators.
-- Safe to run repeatedly.

CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_name TEXT NOT NULL CHECK (length(sender_name) BETWEEN 2 AND 100),
  sender_email TEXT NOT NULL CHECK (length(sender_email) BETWEEN 3 AND 254),
  subject TEXT NOT NULL CHECK (length(subject) BETWEEN 3 AND 150),
  message TEXT NOT NULL CHECK (length(message) BETWEEN 10 AND 3000),
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'open', 'resolved')),
  email_delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (email_delivery_status IN ('pending', 'sent', 'failed')),
  email_delivery_error TEXT,
  admin_reply TEXT,
  replied_at TIMESTAMP WITH TIME ZONE,
  replied_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS support_messages_status_created_idx
  ON public.support_messages(status, created_at DESC);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Browser clients never read or write this table directly. The Contact API
-- and protected administrator API use the server-side service role.
REVOKE ALL ON TABLE public.support_messages FROM anon, authenticated;
