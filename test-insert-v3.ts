
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { data: quizzes, error: quizError } = await supabase.from('quizzes').select('id, kid_id').limit(1);
  if (quizError || !quizzes || quizzes.length === 0) {
    console.error('Error fetching quiz:', quizError);
    return;
  }
  const quiz = quizzes[0];
  console.log('Using quiz:', quiz);

  const { data, error } = await supabase
    .from('quiz_results')
    .insert([{ 
        quiz_id: quiz.id, 
        kid_id: quiz.kid_id, 
        responses: { "1": 0, "2": 1 }, // Complex object
        score: 1, 
        total_questions: 2 
    }]);
    
  if (error) {
    console.error('Error inserting:', JSON.stringify(error, null, 2));
    return;
  }
  console.log('Inserted:', data);
}

testInsert();
