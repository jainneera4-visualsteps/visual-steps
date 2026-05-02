
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCols() {
  console.log('Final check of behavior_definitions columns...');
  // Try to select description explicitly to see if it exists
  const { data, error } = await supabase.from('behavior_definitions').select('description').limit(1);
  if (error) {
    console.error('Column "description" seems to be missing!', error.message);
  } else {
    console.log('Column "description" exists.');
  }
}

checkCols();
