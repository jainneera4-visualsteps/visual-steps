import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
  const sql = `
CREATE TABLE IF NOT EXISTS public.behaviors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kid_id UUID REFERENCES public.kids(id) ON DELETE CASCADE,
    definition_id UUID REFERENCES public.behavior_definitions(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    token_change INTEGER NOT NULL DEFAULT 0,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    hour INTEGER,
    completed BOOLEAN DEFAULT true,
    remarks TEXT,
    occurrence INTEGER DEFAULT 1,
    points INTEGER DEFAULT 0,
    goal INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.behaviors ENABLE ROW LEVEL SECURITY;
`;
  const { data, error } = await supabase.rpc('run_sql', { sql });
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success:', data);
  }
}

createTable();
