-- Run before deploying Skill Builder. Saved lessons are private to their creator.
CREATE TABLE IF NOT EXISTS public.skill_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kid_id uuid NOT NULL REFERENCES public.kids(id) ON DELETE CASCADE,
  title text NOT NULL,
  topic text NOT NULL,
  target_age text NOT NULL DEFAULT '',
  lesson_language text NOT NULL DEFAULT 'English',
  communication_level text NOT NULL DEFAULT '',
  goal text NOT NULL DEFAULT '',
  preferences text NOT NULL DEFAULT '',
  parent_customization text NOT NULL DEFAULT '',
  content jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS skill_lessons_user_updated_idx ON public.skill_lessons (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS skill_lessons_kid_idx ON public.skill_lessons (kid_id);
ALTER TABLE public.skill_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parents manage their skill lessons" ON public.skill_lessons;
CREATE POLICY "Parents manage their skill lessons" ON public.skill_lessons FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.kids WHERE kids.id = skill_lessons.kid_id AND kids.user_id = auth.uid()
  ));
