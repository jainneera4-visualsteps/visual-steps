
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { data, error } = await supabase
    .from('quiz_results')
    .insert([{
      kid_id: '00000000-0000-0000-0000-000000000000',
      quiz_id: '00000000-0000-0000-0000-000000000000',
      score: 10,
      total_questions: 10,
      responses: [],
      questions: [],
      non_existent_column: 'test'
    }]);
    
  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log('Insert success:', data);
  }
}

testInsert();
