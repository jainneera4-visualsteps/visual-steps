
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testColumns() {
  const { error: bError } = await supabase.from('behaviors').select('hour').limit(1);
  if (bError) console.log('Behaviors hour column:', bError.message);
  else console.log('Behaviors hour column exists.');

  const { error: dError } = await supabase.from('behavior_definitions').select('icon').limit(1);
  if (dError) console.log('Definitions icon column:', dError.message);
  else console.log('Definitions icon column exists.');
}

testColumns();
