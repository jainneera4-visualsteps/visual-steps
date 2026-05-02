
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
  console.log('Inspecting behaviors schema...');
  
  const { data, error } = await supabase
    .from('behaviors')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching from behaviors:', error);
  } else {
    console.log('Sample data:', data);
    
    console.log('Attempting to fetch column list via RPC if available...');
    const { data: cols, error: colError } = await supabase.rpc('get_table_columns', { table_name: 'behaviors' });
    if (colError) {
        console.log('get_table_columns RPC failed, trying to guess via empty insert...');
    } else {
        console.log('Columns:', cols);
    }
  }
}

inspectSchema();
