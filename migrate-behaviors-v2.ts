
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateBehaviorsV2() {
  console.log('Migrating behaviors and behavior_definitions tables...');
  
  const { error: tableError } = await supabase.rpc('exec_sql', {
    sql: `
      -- Add icon to behavior_definitions
      DO $$ 
      BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='behavior_definitions' AND column_name='icon') THEN
              ALTER TABLE public.behavior_definitions ADD COLUMN icon TEXT;
          END IF;
      END $$;

      -- Add hour to behaviors
      DO $$ 
      BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='behaviors' AND column_name='hour') THEN
              ALTER TABLE public.behaviors ADD COLUMN hour INTEGER;
          END IF;
      END $$;
    `
  });

  if (tableError) {
    console.error('Error migrating tables:', tableError.message);
  } else {
    console.log('Tables migrated successfully.');
  }
}

migrateBehaviorsV2();
