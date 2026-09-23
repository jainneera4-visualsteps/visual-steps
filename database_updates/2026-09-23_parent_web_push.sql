-- One opt-in subscription per parent device/browser. The API, not the browser,
-- manages this table with the service role. Safe to rerun.
CREATE TABLE IF NOT EXISTS public.parent_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parent_push_subscriptions_user_idx
  ON public.parent_push_subscriptions (user_id);

ALTER TABLE public.parent_push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.parent_push_subscriptions FROM anon, authenticated;
