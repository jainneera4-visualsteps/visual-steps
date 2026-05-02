
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('Starting migration to add missing columns to behaviors table...');
  
  const columns = [
    { name: 'occurrence', type: 'INTEGER', default: '1' },
    { name: 'remarks', type: 'TEXT', default: 'NULL' },
    { name: 'hour', type: 'INTEGER', default: 'NULL' },
    { name: 'completed', type: 'BOOLEAN', default: 'true' }
  ];

  for (const col of columns) {
    console.log(`Adding column ${col.name}...`);
    const { error } = await supabase.rpc('run_sql', {
      sql: `ALTER TABLE behaviors ADD COLUMN IF NOT EXISTS ${col.name} ${col.type} DEFAULT ${col.default};`
    });
    
    if (error) {
      console.warn(`Could not add column ${col.name} via run_sql (might not have permissions):`, error.message);
      // Fallback: try direct SQL if run_sql rpc is not available
      // Unfortunately we can't do direct ALTER TABLE via supabase-js without run_sql RPC or similar
    } else {
      console.log(`Successfully added/checked column ${col.name}`);
    }
  }
}

migrate();
