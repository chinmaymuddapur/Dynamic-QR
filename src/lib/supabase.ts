/**
 * Supabase client — frontend-safe (anon key only).
 *
 * Reads from Vite environment variables:
 *   VITE_SUPABASE_URL       — your Supabase project URL
 *   VITE_SUPABASE_ANON_KEY  — the public anon/publishable key
 *
 * The service_role key must NEVER appear here or in any frontend file.
 * RLS on the backend enforces that anon users cannot access CRM data.
 * Authenticated admin sessions are gated via Supabase Auth.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables.\n' +
    'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env.local file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist session in localStorage so the admin stays logged in across refreshes.
    persistSession: true,
    autoRefreshToken: true,
  },
});
