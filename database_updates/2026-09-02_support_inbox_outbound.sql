-- Administrator-composed messages sent from Support Inbox.
-- Safe to run repeatedly.

CREATE TABLE IF NOT EXISTS public.support_outbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL CHECK (length(subject) BETWEEN 3 AND 150),
  message TEXT NOT NULL CHECK (length(message) BETWEEN 10 AND 5000),
  audience TEXT NOT NULL,
  recipient_count INTEGER NOT NULL CHECK (recipient_count BETWEEN 1 AND 5000),
  recipient_ids UUID[] NOT NULL DEFAULT '{}',
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'partially_sent', 'failed')),
  delivered_count INTEGER NOT NULL DEFAULT 0 CHECK (delivered_count >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  delivery_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  sent_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.support_outbound_messages DROP CONSTRAINT IF EXISTS support_outbound_messages_audience_check;
ALTER TABLE public.support_outbound_messages ADD CONSTRAINT support_outbound_messages_audience_check
  CHECK (audience IN ('all_active_parents', 'all_signed_up_parents', 'selected_parents'));

CREATE INDEX IF NOT EXISTS support_outbound_messages_created_idx
  ON public.support_outbound_messages(created_at DESC);

ALTER TABLE public.support_outbound_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.support_outbound_messages FROM anon, authenticated;
