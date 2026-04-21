
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data: bData, error: bError } = await supabase.from('behaviors').select('*').limit(1);
  if (bError) console.error('Behaviors error:', bError);
  else console.log('Behaviors columns:', bData.length > 0 ? Object.keys(bData[0]) : 'No data');

  const { data: dData, error: dError } = await supabase.from('behavior_definitions').select('*').limit(1);
  if (dError) console.error('Definitions error:', dError);
  else console.log('Definitions columns:', dData.length > 0 ? Object.keys(dData[0]) : 'No data');
}

checkColumns();
