
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkBehaviorLogs() {
  const { data, error } = await supabase.from('behavior_logs').select('*').limit(5);
  if (error) {
    console.error('Error fetching behavior_logs:', error);
  } else {
    console.log('Sample data from behavior_logs:', data);
  }
}
checkBehaviorLogs();
