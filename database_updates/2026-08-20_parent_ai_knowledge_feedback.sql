-- Parent-submitted assistant knowledge gaps. Reports do not train the model
-- automatically; they provide a review queue for verified catalog updates.

CREATE TABLE IF NOT EXISTS public.parent_ai_knowledge_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  assistant_response TEXT,
  page_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS parent_ai_knowledge_gaps_status_created_idx
  ON public.parent_ai_knowledge_gaps(status, created_at DESC);

ALTER TABLE public.parent_ai_knowledge_gaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parents can submit their own AI knowledge gaps" ON public.parent_ai_knowledge_gaps;
DROP POLICY IF EXISTS "Parents can view their own AI knowledge gaps" ON public.parent_ai_knowledge_gaps;

CREATE POLICY "Parents can submit their own AI knowledge gaps"
  ON public.parent_ai_knowledge_gaps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Parents can view their own AI knowledge gaps"
  ON public.parent_ai_knowledge_gaps FOR SELECT
  USING (auth.uid() = user_id);
