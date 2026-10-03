import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "@/lib/env";

let client: SupabaseClient | null = null;

/** Anonymous client for published content. It can only read the public_* views. */
export function publicClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  client ??= createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
