import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  'https://cfvopnzcqbtqcupdomto.supabase.co';

const supabasePublishableKey = 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  'sb_publishable_9Ry6OuD-80stD-4Cz8fMaQ_0EAHlUsU';

if (!supabasePublishableKey) {
  console.warn('Supabase publishable key is missing.');
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
