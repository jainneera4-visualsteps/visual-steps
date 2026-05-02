
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugInsert() {
  console.log('Testing a raw insert into behaviors table...');
  
  // Get a valid kid id first
  const { data: kids, error: kidError } = await supabase.from('kids').select('id').limit(1);
  if (kidError || !kids || kids.length === 0) {
    console.error('No kids found to test with:', kidError);
    return;
  }
  
  const kidId = kids[0].id;
  console.log('Testing with kid_id:', kidId);

  const testLog = {
    kid_id: kidId,
    type: 'desired',
    description: 'Test Behavior ' + new Date().toISOString(),
    date: new Date().toISOString().split('T')[0],
    token_change: 10
  };

  console.log('Attempting insert of:', testLog);
  const { data, error } = await supabase.from('behaviors').insert([testLog]).select();

  if (error) {
    console.error('Insert failed with error detail:', JSON.stringify(error, null, 2));
    
    if (error.code === '42703') {
        console.log('Confirming: Column mismatch error detected.');
    }
  } else {
    console.log('Insert successful! Data:', data);
  }
}

debugInsert();
