import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const createSupabaseClient = (supabaseUrl: string, supabaseAnonKey: string) => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
};

export { createSupabaseClient }; 