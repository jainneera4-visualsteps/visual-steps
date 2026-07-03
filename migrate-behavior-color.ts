import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY must be defined in env.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('Adding color column to behavior_definitions...');
    const { error } = await supabase.rpc('run_sql', {
      sql: `ALTER TABLE public.behavior_definitions ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6';`
    });
    
    if (error) {
      console.error('Error adding color column:', error.message);
    } else {
      console.log('Successfully added/checked column color');
    }
}

migrate();
