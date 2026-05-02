
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkActualData() {
  console.log('Checking actual data in behavior_definitions...');
  const { data, error } = await supabase.from('behavior_definitions').select('*').limit(5);
  
  if (error) {
    console.error('Error fetching data:', error);
    return;
  }
  
  console.log('Rows found:', data?.length);
  if (data && data.length > 0) {
    console.log('Data (first row):', JSON.stringify(data[0], null, 2));
  } else {
    console.log('No data found in table.');
  }
}

checkActualData();
