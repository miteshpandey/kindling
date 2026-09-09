import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-only client. Uses the service role key, so it must never be imported
// into a client component. All DB access in this app goes through /api routes.
let cached: SupabaseClient | null = null;

export function getServerClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.');
  }

  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
