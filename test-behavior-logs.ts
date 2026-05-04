
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
// Need to import types or just use any? 
// The environment should have necessary packages.

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  const logEntry = {
    kid_id: '00000000-0000-0000-0000-000000000000', // Dummy
    definition_id: null,
    type: 'desired',
    description: 'Test entry',
    date: new Date().toISOString().split('T')[0],
    rewards_earned: 0,
    points: 1
  };
  const { data, error } = await supabase
    .from('behavior_logs')
    .insert([logEntry]);

  if (error) {
    console.error('Error inserting into behavior_logs:', JSON.stringify(error, null, 2));
  } else {
    console.log('Inserted into behavior_logs!');
  }
}


checkTable();
