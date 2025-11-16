// Shared Supabase client for Edge Functions
// Task 15, Subtask 3: Shared utilities for database connections

import { createClient } from 'jsr:@supabase/supabase-js@2'

export function createSupabaseClient(
  supabaseUrl: string,
  supabaseKey: string
) {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}
