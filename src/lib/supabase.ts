import { createClient } from '@supabase/supabase-js';

// These variables will be pulled from your environment settings
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if ((!supabaseUrl || !supabaseAnonKey) && import.meta.env.DEV) {
  console.warn('Supabase credentials missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-please-set-env-vars.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
