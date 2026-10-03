import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function clientIpHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const salt = process.env.RATE_LIMIT_SALT || "change-me";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/** Returns true if the request is allowed. Fails open only if the limiter itself errors. */
export async function allowRequest(db: SupabaseClient, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await db.rpc("hit_rate_limit", { p_key: key, p_limit: limit, p_window_seconds: windowSeconds });
  if (error) {
    console.error("rate limiter error", error.message);
    return true;
  }
  return data === true;
}

/**
 * Lightweight spam checks: a hidden honeypot field humans never fill in, and a minimum
 * time between the form appearing and being submitted.
 */
export function looksLikeSpam(fd: FormData): boolean {
  if (String(fd.get("website") ?? "").length > 0) return true;
  const started = Number(fd.get("started_at") ?? 0);
  if (!started || Date.now() - started < 2500) return true;
  return false;
}
