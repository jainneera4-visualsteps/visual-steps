
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
        quiz_id: '20d028c4-f9cd-4d7b-b9ba-2b1d416dd0e8', 
        kid_id: '8737f221-8f73-4774-ac17-2866dcaca1c4', 
        responses: { "1": 0 }, 
        score: 1, 
        total_questions: 1,
        questions: [{ question: 'test', correctAnswerIndex: 0 }] // Testing this new column
    }]);
    
  if (error) {
    console.error('Error inserting:', JSON.stringify(error, null, 2));
    return;
  }
  console.log('Inserted successfully!');
}

testInsert();
