
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase.from('quizzes').select('*').limit(1);
  if (error) {
    console.error('Error fetching quizzes:', error);
    return;
  }
  if (data && data.length > 0) {
    console.log('Columns in quizzes table:', Object.keys(data[0]));
  } else {
    console.log('No data in quizzes table to infer columns.');
  }
}

checkSchema();
