import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkSchema() {
  const { data, error } = await supabase.from('behavior_definitions').select('*').limit(10);
  if (error) {
    console.error('Error fetching behavior_definitions:', error);
  } else if (data && data.length > 0) {
    const allKeys = new Set<string>();
    data.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));
    console.log('Columns in behavior_definitions:', Array.from(allKeys));
    console.log('Sample data:', data[0]);
  } else {
    console.log('No data in behavior_definitions.');
  }
  
  const { data: tData, error: tError } = await supabase.from('behavior_tracker').select('*').limit(1);
  if (tError) {
    console.error('Error fetching behavior_tracker:', tError);
  } else if (tData && tData.length > 0) {
    console.log('Columns in behavior_tracker:', Object.keys(tData[0]));
  }
}

checkSchema();
