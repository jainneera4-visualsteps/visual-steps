import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('Adding is_active column to behavior_definitions...');
    // Try to add column directly via SQL if possible
    const { error } = await supabase.rpc('run_sql', {
      sql: `ALTER TABLE public.behavior_definitions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;`
    });
    
    if (error) {
      console.error('Error adding is_active column:', error.message);
    } else {
      console.log('Successfully added/checked column is_active');
    }
}

migrate();
