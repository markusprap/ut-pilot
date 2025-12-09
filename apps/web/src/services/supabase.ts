
import { createClient } from '@supabase/supabase-js';

// NOTE: These environment variables must be set in your .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase credentials missing! Database features will not work.");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
