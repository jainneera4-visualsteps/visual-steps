
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const tables = ['users', 'kids', 'chatbots', 'chat_history', 'activity_templates', 'activity_template_steps', 'activities', 'activity_steps', 'activity_history', 'activity_history_steps', 'social_stories', 'reward_items', 'reward_purchases', 'worksheets', 'quizzes', 'behaviors'];
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.error(`Error checking ${table} table:`, error.message);
    } else {
      console.log(`${table} table exists.`);
    }
  }
}

checkTables();
