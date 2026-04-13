
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { data, error } = await supabase
    .from('quiz_results')
    .insert([{ quiz_id: '00000000-0000-0000-0000-000000000000', kid_id: '00000000-0000-0000-0000-000000000000', responses: [], score: 0, total_questions: 0 }]);
    
  if (error) {
    console.error('Error inserting:', JSON.stringify(error, null, 2));
    return;
  }
  console.log('Inserted:', data);
}

testInsert();
