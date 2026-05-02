
CREATE TABLE IF NOT EXISTS public.behavior_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kid_id UUID REFERENCES public.kids(id) ON DELETE CASCADE,
    definition_id UUID REFERENCES public.behavior_definitions(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    points INTEGER DEFAULT 0,
    rewards_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.behavior_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their kids behavior logs" ON public.behavior_logs FOR SELECT USING (kid_id IN (SELECT id FROM public.kids WHERE user_id = auth.uid()));
