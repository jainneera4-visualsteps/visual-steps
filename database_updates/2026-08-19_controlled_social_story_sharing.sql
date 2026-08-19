-- Private, expiring and revocable social-story sharing links.
-- Safe to run repeatedly.

CREATE TABLE IF NOT EXISTS public.social_story_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.social_stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS social_story_shares_story_id_idx
  ON public.social_story_shares(story_id);

ALTER TABLE public.social_story_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own social story shares" ON public.social_story_shares;
DROP POLICY IF EXISTS "Users can create their own social story shares" ON public.social_story_shares;
DROP POLICY IF EXISTS "Users can update their own social story shares" ON public.social_story_shares;
DROP POLICY IF EXISTS "Users can delete their own social story shares" ON public.social_story_shares;

CREATE POLICY "Users can view their own social story shares"
  ON public.social_story_shares FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own social story shares"
  ON public.social_story_shares FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND story_id IN (SELECT id FROM public.social_stories WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can update their own social story shares"
  ON public.social_story_shares FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own social story shares"
  ON public.social_story_shares FOR DELETE USING (auth.uid() = user_id);
