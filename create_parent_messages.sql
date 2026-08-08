-- Add parent message retention days setting on users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS max_parent_message_days INTEGER DEFAULT 20;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS max_parent_messages INTEGER DEFAULT 20;

-- Create parent_messages table
CREATE TABLE IF NOT EXISTS public.parent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  kid_id UUID REFERENCES public.kids(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_parent_messages_user_kid_created_at
  ON public.parent_messages (user_id, kid_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_parent_messages_kid_created_at
  ON public.parent_messages (kid_id, created_at DESC);

-- RLS
ALTER TABLE public.parent_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their kids parent messages"
    ON public.parent_messages FOR SELECT
    USING (
      kid_id IN (
        SELECT id FROM public.kids k
        WHERE k.user_id = auth.uid() OR (to_jsonb(k)->>'parent_id')::uuid = auth.uid()
      )
      AND user_id = auth.uid()
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert their kids parent messages"
    ON public.parent_messages FOR INSERT
    WITH CHECK (
      kid_id IN (
        SELECT id FROM public.kids k
        WHERE k.user_id = auth.uid() OR (to_jsonb(k)->>'parent_id')::uuid = auth.uid()
      )
      AND user_id = auth.uid()
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their kids parent messages"
    ON public.parent_messages FOR UPDATE
    USING (
      kid_id IN (
        SELECT id FROM public.kids k
        WHERE k.user_id = auth.uid() OR (to_jsonb(k)->>'parent_id')::uuid = auth.uid()
      )
      AND user_id = auth.uid()
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their kids parent messages"
    ON public.parent_messages FOR DELETE
    USING (
      kid_id IN (
        SELECT id FROM public.kids k
        WHERE k.user_id = auth.uid() OR (to_jsonb(k)->>'parent_id')::uuid = auth.uid()
      )
      AND user_id = auth.uid()
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
