
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error fetching quiz:', error);
    return;
  }
  if (data && data.length > 0) {
    console.log('Quiz structure:', Object.keys(data[0]));
  } else {
    console.log('No quizzes found to inspect structure.');
    // Try to insert and fail to see columns?
    const { error: insertError } = await supabase.from('quizzes').insert([{ non_existent_column: 'test' }]);
    console.log('Insert error structure clues:', insertError);
  }
}

checkSchema();
