
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

  console.log('\n--- Debugging Behaviors ---');
  const { data: behaviors, error: behaviorError } = await supabase
    .from('behaviors')
    .select('*, behavior_definitions(*)')
    .limit(1);
  if (behaviorError) console.error('Behaviors Error:', behaviorError);
  else console.log('Behaviors OK');
}

debugErrors();
