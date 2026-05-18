import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('Adding kid_id column to worksheets...');
    const { error } = await supabase.rpc('run_sql', {
      sql: `ALTER TABLE public.worksheets ADD COLUMN IF NOT EXISTS kid_id UUID REFERENCES public.kids(id) ON DELETE CASCADE;`
    });
    
    if (error) {
      console.error('Error adding kid_id column:', error.message);
    } else {
      console.log('Successfully added/checked column kid_id for worksheets');
    }
}

migrate();
