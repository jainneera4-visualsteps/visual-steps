
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testColumns() {
  const { data, error } = await supabase.from('behavior_definitions').select('*').limit(1);
  if (error) {
    console.error('Error fetching definition:', error.message);
  } else if (data && data.length > 0) {
    console.log('Columns in behavior_definitions:', Object.keys(data[0]));
  } else {
    console.log('No behavior definitions found, but query succeeded.');
    // Let's try to fetch a list of columns from information_schema if possible
    const { data: cols, error: colError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'behavior_definitions');
    if (colError) {
      console.error('Error fetching columns info:', colError.message);
    } else {
      console.log('Columns in behavior_definitions from information_schema:', cols.map(c => c.column_name));
    }
  }
}

testColumns();
