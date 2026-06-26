import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// Prefer the legacy service_role JWT (MICL_SERVICE_KEY). The auto-injected
// SUPABASE_SERVICE_ROLE_KEY on this project is the new short-form `sb_secret_…`
// key, which supabase-js sends as a Bearer token that PostgREST can't parse as a
// JWT — causing "permission denied" and silent RLS fallthrough. The legacy JWT
// is handled reliably.
const SERVICE_ROLE = Deno.env.get("MICL_SERVICE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

// Service-role client: bypasses RLS, used for all reads/writes after auth.
export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });
}

// Resolve the caller's user id from their Authorization bearer token.
// Returns null if missing/invalid.
export async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const client = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}
