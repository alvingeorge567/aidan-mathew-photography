import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let client: SupabaseClient | null = null;

/**
 * Service-role client. Bypasses RLS — use only on the server, only after validating input
 * (public forms) or after requireAdmin() (publishing media to the public bucket).
 */
export function serviceClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env.supabaseUrl || !key) return null;
  client ??= createClient(env.supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
