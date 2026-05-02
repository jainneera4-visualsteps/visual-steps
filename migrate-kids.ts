
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('Adding missing column to kids table...');
  
  const { error } = await supabase.rpc('run_sql', {
    sql: `ALTER TABLE kids ADD COLUMN IF NOT EXISTS pending_reward JSONB;`
  });
  
  if (error) {
    console.error('Migration failed:', error.message);
  } else {
    console.log('Successfully added pending_reward column to kids table');
  }
}

migrate();
