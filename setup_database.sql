-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS public.activity_history_steps CASCADE;

DROP TABLE IF EXISTS public.activity_history CASCADE;
DROP TABLE IF EXISTS public.activity_steps CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.activity_template_steps CASCADE;
DROP TABLE IF EXISTS public.activity_templates CASCADE;
DROP TABLE IF EXISTS public.chat_history CASCADE;
DROP TABLE IF EXISTS public.chatbots CASCADE;
DROP TABLE IF EXISTS public.reward_purchases CASCADE;
DROP TABLE IF EXISTS public.reward_items CASCADE;
DROP TABLE IF EXISTS public.social_story_shares CASCADE;
DROP TABLE IF EXISTS public.social_stories CASCADE;
DROP TABLE IF EXISTS public.worksheets CASCADE;
DROP TABLE IF EXISTS public.quiz_results CASCADE;
DROP TABLE IF EXISTS public.quizzes CASCADE;
DROP TABLE IF EXISTS public.parent_messages CASCADE;
DROP TABLE IF EXISTS public.parent_ai_usage CASCADE;
DROP TABLE IF EXISTS public.parent_ai_knowledge_gaps CASCADE;
DROP TABLE IF EXISTS public.kids CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Create users table
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    password_hash TEXT,
    max_parent_message_days INTEGER DEFAULT 20,
    max_parent_messages INTEGER DEFAULT 20,
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create kids table
CREATE TABLE public.kids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dob DATE,
    grade_level TEXT,
    hobbies TEXT,
    interests TEXT,
    strengths TEXT,
    weaknesses TEXT,
    sensory_issues TEXT,
    behavioral_issues TEXT,
    can_print BOOLEAN DEFAULT false,
    avatar TEXT,
    start_time TIME,
    end_time TIME,
    max_incomplete_limit INTEGER,
    reward_type TEXT DEFAULT 'Penny',
    reward_quantity INTEGER DEFAULT 1,
    rules TEXT,
    theme TEXT DEFAULT 'sky',
    kid_code TEXT,
    reward_balance INTEGER DEFAULT 0,
    therapies TEXT,
    timezone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create activity_templates table
CREATE TABLE public.activity_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    activity_type TEXT,
    category TEXT,
    repeat_frequency TEXT,
    time_of_day TEXT,
    description TEXT,
    link TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create activity_template_steps table
CREATE TABLE public.activity_template_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.activity_templates(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create activities table
CREATE TABLE public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kid_id UUID REFERENCES public.kids(id) ON DELETE CASCADE,
    activity_type TEXT,
    category TEXT,
    repeat_frequency TEXT,
    repeat_interval INTEGER,
    repeat_unit TEXT,
    repeats_till DATE,
    time_of_day TEXT,
    description TEXT,
    link TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'pending',
    requires_verification BOOLEAN NOT NULL DEFAULT false,
    submitted_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    due_date DATE,
    completion_date TIMESTAMP WITH TIME ZONE,
    attempt_generation INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.activities
  ADD CONSTRAINT activities_status_check
  CHECK (status IN ('pending', 'awaiting_verification', 'completed'));

-- Create activity_steps table
CREATE TABLE public.activity_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create activity_history table
CREATE TABLE public.activity_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kid_id UUID REFERENCES public.kids(id) ON DELETE CASCADE,
    activity_type TEXT,
    category TEXT,
    time_of_day TEXT,
    description TEXT,
    link TEXT,
    image_url TEXT,
    due_date DATE,
    completion_date TEXT,
    reward_qty INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create activity_history_steps table
CREATE TABLE public.activity_history_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    history_id UUID REFERENCES public.activity_history(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    description TEXT,
    image_url TEXT,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    kid_id UUID REFERENCES public.kids(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create social_stories table
CREATE TABLE public.social_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    kid_id UUID REFERENCES public.kids(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.social_story_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES public.social_stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create reward_items table
CREATE TABLE public.reward_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kid_id UUID REFERENCES public.kids(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cost INTEGER NOT NULL,
    image_url TEXT,
    location TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create reward_purchases table
CREATE TABLE public.reward_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kid_id UUID REFERENCES public.kids(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    cost INTEGER NOT NULL,
    location TEXT,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create parent_messages table
CREATE TABLE public.parent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    kid_id UUID REFERENCES public.kids(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.parent_ai_usage (
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL,
    question_count INTEGER NOT NULL DEFAULT 0 CHECK (question_count >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, usage_date)
);

CREATE TABLE public.parent_ai_knowledge_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    assistant_response TEXT,
    page_path TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX parent_ai_knowledge_gaps_status_created_idx ON public.parent_ai_knowledge_gaps(status, created_at DESC);

CREATE INDEX idx_parent_messages_user_kid_created_at
    ON public.parent_messages (user_id, kid_id, created_at DESC);

CREATE INDEX idx_parent_messages_kid_created_at
    ON public.parent_messages (kid_id, created_at DESC);

-- Create worksheets table
CREATE TABLE public.worksheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    kid_id UUID REFERENCES public.kids(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    topic TEXT,
    subject TEXT,
    target_age TEXT,
    grade_level TEXT,
    worksheet_type TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create quizzes table
CREATE TABLE public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    kid_id UUID REFERENCES public.kids(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    topic TEXT,
    difficulty TEXT,
    target_age TEXT,
    grade_level TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.quiz_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    kid_id UUID NOT NULL REFERENCES public.kids(id) ON DELETE CASCADE,
    activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
    attempt_generation INTEGER,
    responses JSONB NOT NULL,
    questions JSONB,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE UNIQUE INDEX quiz_results_assignment_attempt_unique
  ON public.quiz_results(activity_id, attempt_generation)
  WHERE activity_id IS NOT NULL AND attempt_generation IS NOT NULL;

-- RLS Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_template_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_history_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_story_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_ai_knowledge_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worksheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

-- Users
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Kids
CREATE POLICY "Users can view their own kids" ON public.kids FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own kids" ON public.kids FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own kids" ON public.kids FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own kids" ON public.kids FOR DELETE USING (auth.uid() = user_id);

-- Activity Templates
CREATE POLICY "Users can view their own activity templates" ON public.activity_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own activity templates" ON public.activity_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own activity templates" ON public.activity_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own activity templates" ON public.activity_templates FOR DELETE USING (auth.uid() = user_id);

-- Activity Template Steps
CREATE POLICY "Users can view their own activity template steps" ON public.activity_template_steps FOR SELECT USING (template_id IN (SELECT id FROM public.activity_templates WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert their own activity template steps" ON public.activity_template_steps FOR INSERT WITH CHECK (template_id IN (SELECT id FROM public.activity_templates WHERE user_id = auth.uid()));
CREATE POLICY "Users can update their own activity template steps" ON public.activity_template_steps FOR UPDATE USING (template_id IN (SELECT id FROM public.activity_templates WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete their own activity template steps" ON public.activity_template_steps FOR DELETE USING (template_id IN (SELECT id FROM public.activity_templates WHERE user_id = auth.uid()));

-- Activities
CREATE POLICY "Users can view their kids activities" ON public.activities FOR SELECT USING (kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert their kids activities" ON public.activities FOR INSERT WITH CHECK (kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid()));
CREATE POLICY "Users can update their kids activities" ON public.activities FOR UPDATE USING (kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete their kids activities" ON public.activities FOR DELETE USING (kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid()));

-- Activity Steps
CREATE POLICY "Users can view their kids activity steps" ON public.activity_steps FOR SELECT USING (activity_id IN (SELECT id FROM public.activities WHERE kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid())));
CREATE POLICY "Users can insert their kids activity steps" ON public.activity_steps FOR INSERT WITH CHECK (activity_id IN (SELECT id FROM public.activities WHERE kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid())));
CREATE POLICY "Users can update their kids activity steps" ON public.activity_steps FOR UPDATE USING (activity_id IN (SELECT id FROM public.activities WHERE kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid())));
CREATE POLICY "Users can delete their kids activity steps" ON public.activity_steps FOR DELETE USING (activity_id IN (SELECT id FROM public.activities WHERE kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid())));

-- Activity History
CREATE POLICY "Users can view their kids activity history" ON public.activity_history FOR SELECT USING (kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert their kids activity history" ON public.activity_history FOR INSERT WITH CHECK (kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid()));
CREATE POLICY "Users can update their kids activity history" ON public.activity_history FOR UPDATE USING (kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete their kids activity history" ON public.activity_history FOR DELETE USING (kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid()));

-- Activity History Steps
CREATE POLICY "Users can view their kids activity history steps" ON public.activity_history_steps FOR SELECT USING (kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert their kids activity history steps" ON public.activity_history_steps FOR INSERT WITH CHECK (kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid()));
CREATE POLICY "Users can update their kids activity history steps" ON public.activity_history_steps FOR UPDATE USING (kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete their kids activity history steps" ON public.activity_history_steps FOR DELETE USING (kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid()));

-- Social Stories
CREATE POLICY "Users can view their own social stories" ON public.social_stories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own social stories" ON public.social_stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own social stories" ON public.social_stories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own social stories" ON public.social_stories FOR DELETE USING (auth.uid() = user_id);

-- Social Story Shares
CREATE POLICY "Users can view their own social story shares" ON public.social_story_shares FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own social story shares" ON public.social_story_shares FOR INSERT WITH CHECK (auth.uid() = user_id AND story_id IN (SELECT id FROM public.social_stories WHERE user_id = auth.uid()));
CREATE POLICY "Users can update their own social story shares" ON public.social_story_shares FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own social story shares" ON public.social_story_shares FOR DELETE USING (auth.uid() = user_id);

-- Reward Items
CREATE POLICY "Users can view their kids reward items" ON public.reward_items FOR SELECT USING (kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert their kids reward items" ON public.reward_items FOR INSERT WITH CHECK (kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid()));
CREATE POLICY "Users can update their kids reward items" ON public.reward_items FOR UPDATE USING (kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete their kids reward items" ON public.reward_items FOR DELETE USING (kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid()));

-- Reward Purchases
CREATE POLICY "Users can view their kids reward purchases" ON public.reward_purchases FOR SELECT USING (kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert their kids reward purchases" ON public.reward_purchases FOR INSERT WITH CHECK (kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid()));
CREATE POLICY "Users can update their kids reward purchases" ON public.reward_purchases FOR UPDATE USING (kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete their kids reward purchases" ON public.reward_purchases FOR DELETE USING (kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid()));

-- Parent Messages
CREATE POLICY "Users can view their kids parent messages" ON public.parent_messages FOR SELECT USING (kid_id IN (SELECT id FROM public.kids k WHERE k.user_id = auth.uid() OR (to_jsonb(k)->>'parent_id')::uuid = auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Users can insert their kids parent messages" ON public.parent_messages FOR INSERT WITH CHECK (kid_id IN (SELECT id FROM public.kids k WHERE k.user_id = auth.uid() OR (to_jsonb(k)->>'parent_id')::uuid = auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Users can update their kids parent messages" ON public.parent_messages FOR UPDATE USING (kid_id IN (SELECT id FROM public.kids k WHERE k.user_id = auth.uid() OR (to_jsonb(k)->>'parent_id')::uuid = auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Users can delete their kids parent messages" ON public.parent_messages FOR DELETE USING (kid_id IN (SELECT id FROM public.kids k WHERE k.user_id = auth.uid() OR (to_jsonb(k)->>'parent_id')::uuid = auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Parents can view their own AI usage" ON public.parent_ai_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Parents can submit their own AI knowledge gaps" ON public.parent_ai_knowledge_gaps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Parents can view their own AI knowledge gaps" ON public.parent_ai_knowledge_gaps FOR SELECT USING (auth.uid() = user_id);

-- Worksheets
CREATE POLICY "Users can view their own worksheets" ON public.worksheets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own worksheets" ON public.worksheets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own worksheets" ON public.worksheets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own worksheets" ON public.worksheets FOR DELETE USING (auth.uid() = user_id);

-- Quizzes
CREATE POLICY "Users can view their own quizzes" ON public.quizzes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own quizzes" ON public.quizzes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own quizzes" ON public.quizzes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own quizzes" ON public.quizzes FOR DELETE USING (auth.uid() = user_id);

-- Quiz Results
CREATE POLICY "Users can view their kids quiz results" ON public.quiz_results FOR SELECT USING (kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert their kids quiz results" ON public.quiz_results FOR INSERT WITH CHECK (kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete their kids quiz results" ON public.quiz_results FOR DELETE USING (kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid()));

-- Functions
CREATE OR REPLACE FUNCTION public.consume_parent_ai_question()
RETURNS TABLE (allowed BOOLEAN, used INTEGER, remaining INTEGER, daily_limit INTEGER, resets_at TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
  requesting_user UUID := auth.uid();
  current_day DATE := (timezone('utc'::text, now()))::date;
  current_count INTEGER;
  was_consumed BOOLEAN := false;
  limit_value CONSTANT INTEGER := 30;
BEGIN
  IF requesting_user IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.parent_ai_usage (user_id, usage_date, question_count, updated_at)
  VALUES (requesting_user, current_day, 1, timezone('utc'::text, now()))
  ON CONFLICT (user_id, usage_date) DO UPDATE
    SET question_count = public.parent_ai_usage.question_count + 1, updated_at = timezone('utc'::text, now())
    WHERE public.parent_ai_usage.question_count < limit_value
  RETURNING question_count INTO current_count;
  IF current_count IS NOT NULL THEN
    was_consumed := true;
  ELSE
    SELECT question_count INTO current_count FROM public.parent_ai_usage WHERE user_id = requesting_user AND usage_date = current_day;
  END IF;
  RETURN QUERY SELECT was_consumed, COALESCE(current_count, 0), GREATEST(limit_value - COALESCE(current_count, 0), 0), limit_value, ((current_day + 1)::timestamp AT TIME ZONE 'UTC');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.consume_parent_ai_question() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_parent_ai_question() FROM anon;
GRANT EXECUTE ON FUNCTION public.consume_parent_ai_question() TO authenticated;

CREATE OR REPLACE FUNCTION public.increment_reward_balance(kid_id_param UUID, amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE public.kids
  SET reward_balance = COALESCE(reward_balance, 0) + amount
  WHERE id = kid_id_param
    AND (user_id = auth.uid() OR auth.role() = 'service_role');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not authorized to update this child reward balance'
      USING ERRCODE = '42501';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.increment_reward_balance(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_reward_balance(UUID, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_reward_balance(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_reward_balance(UUID, INTEGER) TO service_role;
