import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cfvopnzcqbtqcupdomto.supabase.co';
const supabasePublishableKey = 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  '';

if (!supabasePublishableKey) {
  console.warn('Supabase publishable key (VITE_SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_ANON_KEY) is missing in environment variables.');
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
