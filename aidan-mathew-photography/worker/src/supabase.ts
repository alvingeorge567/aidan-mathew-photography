import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "./config.ts";

let client: SupabaseClient | null = null;

/** The worker is a trusted server process and uses the service role. Never ship this key to a browser. */
export function db(): SupabaseClient {
  client ??= createClient(config.supabaseUrl(), config.serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
