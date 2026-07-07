import { createClient } from "@supabase/supabase-js";

// Server-only: uses the service role key, which bypasses RLS.
// Never import this from a client component.
export function supabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
