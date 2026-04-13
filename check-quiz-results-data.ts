
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data, error } = await supabase
    .from('quiz_results')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error fetching data:', error);
    return;
  }
  if (data && data.length > 0) {
    console.log('Keys in quiz_results row:', Object.keys(data[0]));
    console.log('Sample row:', data[0]);
  } else {
    console.log('No data in quiz_results table.');
  }
}

checkData();
