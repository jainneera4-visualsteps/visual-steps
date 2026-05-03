
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugErrors() {
  console.log('--- Debugging Behavior Definitions ---');
  const { data: defs, error: defError } = await supabase
    .from('behavior_definitions')
    .select('*')
    .limit(1);
  if (defError) console.error('Behavior Definitions Error:', defError);
  else console.log('Behavior Definitions OK');

  console.log('\n--- Debugging Behavior Logs ---');
  const { data: behaviors, error: behaviorError } = await supabase
    .from('behavior_logs')
    .select('*, behavior_definitions(*)')
    .limit(1);
  if (behaviorError) console.error('Behavior Logs Error:', behaviorError);
  else console.log('Behavior Logs OK');
}

debugErrors();
