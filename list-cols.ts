
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listColsDetails() {
  console.log('Listing all column names in behavior_definitions...');
  const { data, error } = await supabase.rpc('get_table_columns_names', { t_name: 'behavior_definitions' });
  
  if (error) {
     // RPC might not exist, try another way: select a row and look at keys
     const { data: row, error: rowError } = await supabase.from('behavior_definitions').select('*').limit(1);
     if (rowError) {
         console.error('Error:', rowError);
     } else if (row && row.length > 0) {
         console.log('Columns found in data:', Object.keys(row[0]));
     } else {
         console.log('Table is empty, trying direct SQL query check.');
         // We can't do direct SQL through supabase-js easily without RPC.
         // Let's try to select a few common names.
         const testCols = ['description', 'remarks', 'desc', 'details', 'name', 'token_reward'];
         for (const col of testCols) {
            const { error: colErr } = await supabase.from('behavior_definitions').select(col).limit(1);
            console.log(`Column "${col}" test:`, colErr ? 'MISSING' : 'EXISTS');
         }
     }
     return;
  }
  console.log('Columns:', data);
}

listColsDetails();
