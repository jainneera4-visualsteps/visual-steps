-- Consent-based weekly newsletter archive and subscriptions.
-- Safe to run repeatedly. Subscriber addresses and delivery tokens remain private.

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'unsubscribed')),
  confirmation_token_hash TEXT UNIQUE,
  unsubscribe_token_hash TEXT NOT NULL UNIQUE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  last_sent_issue_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_date DATE NOT NULL UNIQUE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  title TEXT NOT NULL,
  introduction TEXT NOT NULL,
  new_features JSONB NOT NULL DEFAULT '[]'::jsonb,
  feature_details JSONB NOT NULL DEFAULT '[]'::jsonb,
  parent_testimonials JSONB NOT NULL DEFAULT '[]'::jsonb,
  parent_tips JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.parent_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  quote TEXT NOT NULL,
  feature_title TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read published newsletters" ON public.newsletters;
CREATE POLICY "Anyone can read published newsletters"
  ON public.newsletters FOR SELECT USING (published_at IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can read approved parent testimonials" ON public.parent_testimonials;
CREATE POLICY "Anyone can read approved parent testimonials"
  ON public.parent_testimonials FOR SELECT USING (approved_at IS NOT NULL);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_delivery_idx
  ON public.newsletter_subscribers(status, last_sent_issue_date);
CREATE INDEX IF NOT EXISTS parent_testimonials_approved_idx
  ON public.parent_testimonials(approved_at DESC) WHERE approved_at IS NOT NULL;
