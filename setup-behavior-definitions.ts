
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function setupBehaviorDefinitions() {
  console.log('Setting up behavior_definitions table...');
  
  // Create behavior_definitions table
  const { error: tableError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS public.behavior_definitions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          kid_id UUID REFERENCES public.kids(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          type TEXT NOT NULL, -- 'desired' or 'undesired'
          token_reward INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
      
      -- Add definition_id and token_change to behaviors table if they don't exist
      DO $$ 
      BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='behaviors' AND column_name='definition_id') THEN
              ALTER TABLE public.behaviors ADD COLUMN definition_id UUID REFERENCES public.behavior_definitions(id) ON DELETE SET NULL;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='behaviors' AND column_name='token_change') THEN
              ALTER TABLE public.behaviors ADD COLUMN token_change INTEGER NOT NULL DEFAULT 0;
          END IF;
      END $$;
    `
  });

  if (tableError) {
    console.error('Error setting up behavior_definitions table:', tableError.message);
    // If exec_sql RPC is not available, we might need another way, but usually it's there in AIS
  } else {
    console.log('behavior_definitions table setup successfully.');
  }
}

setupBehaviorDefinitions();
