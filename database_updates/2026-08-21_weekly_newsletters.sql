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

-- Parent contributions are private submissions until a moderator approves them.
CREATE TABLE IF NOT EXISTS public.newsletter_community_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  contribution_type TEXT NOT NULL CHECK (contribution_type IN ('story', 'news', 'information', 'tip', 'testimonial', 'advertisement')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  display_name TEXT NOT NULL,
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  consent_to_publish BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Explicit administrator allow-list. Membership is managed only through the
-- Supabase SQL editor/service role; browser clients receive no table policy.
CREATE TABLE IF NOT EXISTS public.app_admins (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Singleton delivery configuration. The daily Vercel cron reads this row and
-- sends only on the selected UTC weekday (0 Sunday through 6 Saturday).
CREATE TABLE IF NOT EXISTS public.newsletter_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  delivery_weekday INTEGER NOT NULL DEFAULT 1 CHECK (delivery_weekday BETWEEN 0 AND 6),
  delivery_hour INTEGER NOT NULL DEFAULT 0 CHECK (delivery_hour BETWEEN 0 AND 23),
  delivery_timezone TEXT NOT NULL DEFAULT 'America/New_York',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
INSERT INTO public.newsletter_settings (id, delivery_weekday)
VALUES (true, 1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.newsletter_settings
  ADD COLUMN IF NOT EXISTS delivery_hour INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_timezone TEXT NOT NULL DEFAULT 'America/New_York';
ALTER TABLE public.newsletter_settings DROP CONSTRAINT IF EXISTS newsletter_settings_delivery_hour_check;
ALTER TABLE public.newsletter_settings
  ADD CONSTRAINT newsletter_settings_delivery_hour_check CHECK (delivery_hour BETWEEN 0 AND 23);

ALTER TABLE public.newsletters
  ADD COLUMN IF NOT EXISTS feature_previews JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS community_posts JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS popular_features JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recommended_resources JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS suggested_books_resources JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS advertisements JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS membership_details JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS footer_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS section_titles JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS section_visibility JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Older versions of this table used a five-value contribution-type check.
-- Replace it so approved, clearly labeled mission-aligned advertisements can
-- share the same protected moderation workflow.
ALTER TABLE public.newsletter_community_submissions
  DROP CONSTRAINT IF EXISTS newsletter_community_submissions_contribution_type_check;
ALTER TABLE public.newsletter_community_submissions
  ADD CONSTRAINT newsletter_community_submissions_contribution_type_check
  CHECK (contribution_type IN ('story', 'news', 'information', 'tip', 'testimonial', 'advertisement'));

-- Family stories may need more room than a short testimonial or tip. Keep a
-- bounded long-form limit while allowing parents to share a complete account.
ALTER TABLE public.newsletter_community_submissions
  DROP CONSTRAINT IF EXISTS newsletter_community_submissions_content_check;
ALTER TABLE public.newsletter_community_submissions
  ADD CONSTRAINT newsletter_community_submissions_content_check
  CHECK (
    (status = 'draft' AND length(btrim(content)) BETWEEN 0 AND 10000)
    OR (status <> 'draft' AND length(btrim(content)) BETWEEN 20 AND 10000)
  );

-- Drafts may be incomplete. Full publishing requirements apply when a parent
-- submits the contribution for review.
ALTER TABLE public.newsletter_community_submissions
  DROP CONSTRAINT IF EXISTS newsletter_community_submissions_status_check,
  DROP CONSTRAINT IF EXISTS newsletter_community_submissions_title_check,
  DROP CONSTRAINT IF EXISTS newsletter_community_submissions_display_name_check;
ALTER TABLE public.newsletter_community_submissions
  ADD CONSTRAINT newsletter_community_submissions_status_check
    CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  ADD CONSTRAINT newsletter_community_submissions_title_check
    CHECK ((status = 'draft' AND length(btrim(title)) BETWEEN 0 AND 120)
      OR (status <> 'draft' AND length(btrim(title)) BETWEEN 3 AND 120)),
  ADD CONSTRAINT newsletter_community_submissions_display_name_check
    CHECK ((status = 'draft' AND length(btrim(display_name)) BETWEEN 0 AND 80)
      OR (status <> 'draft' AND length(btrim(display_name)) BETWEEN 2 AND 80));

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_community_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read published newsletters" ON public.newsletters;
CREATE POLICY "Anyone can read published newsletters"
  ON public.newsletters FOR SELECT USING (published_at IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can read approved parent testimonials" ON public.parent_testimonials;
CREATE POLICY "Anyone can read approved parent testimonials"
  ON public.parent_testimonials FOR SELECT USING (approved_at IS NOT NULL);

DROP POLICY IF EXISTS "Parents can view their own newsletter submissions" ON public.newsletter_community_submissions;
DROP POLICY IF EXISTS "Parents can submit newsletter contributions" ON public.newsletter_community_submissions;
CREATE POLICY "Parents can view their own newsletter submissions"
  ON public.newsletter_community_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Parents can submit newsletter contributions"
  ON public.newsletter_community_submissions FOR INSERT WITH CHECK (
    auth.uid() = user_id AND status = 'pending' AND consent_to_publish = true
  );

CREATE INDEX IF NOT EXISTS newsletter_subscribers_delivery_idx
  ON public.newsletter_subscribers(status, last_sent_issue_date);
CREATE INDEX IF NOT EXISTS parent_testimonials_approved_idx
  ON public.parent_testimonials(approved_at DESC) WHERE approved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS newsletter_community_review_idx
  ON public.newsletter_community_submissions(status, submitted_at DESC);

-- ONE-TIME ADMIN SETUP (run separately after replacing the email):
-- INSERT INTO public.app_admins (user_id)
-- SELECT id FROM public.users WHERE lower(email) = lower('YOUR_VISUAL_STEPS_EMAIL')
-- ON CONFLICT (user_id) DO NOTHING;
