
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log('Testing insert with description...');
  const payload = {
    kid_id: 'e41c4ea3-69a7-43ce-a260-7f4533438e53', // Using the kid_id from previous check
    name: 'Test Logic',
    type: 'desired',
    token_reward: 50,
    description: 'This is a test description'
  };
  
  const { data, error } = await supabase.from('behavior_definitions').insert([payload]).select().single();
  
  if (error) {
    console.error('Insert failed:', error);
  } else {
    console.log('Insert success:', data);
  }
}

testInsert();
