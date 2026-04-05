import { createClient } from '@supabase/supabase-js';

// These variables will be pulled from your environment settings
const supabaseUrl = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Client Supabase URL:', supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : 'undefined');
console.log('Client Supabase Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}...` : 'undefined');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Please add SUPABASE_URL and SUPABASE_KEY to your environment variables.');
}

export const supabase = createClient(
  supabaseUrl || 'https://vulvwrwjhrsdxypqqfyn.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
