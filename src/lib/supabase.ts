import { createClient } from '@supabase/supabase-js';

// These variables will be pulled from your environment settings
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Client Supabase URL:', supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : 'undefined');
console.log('Client Supabase Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}...` : 'undefined');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-please-set-env-vars.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
