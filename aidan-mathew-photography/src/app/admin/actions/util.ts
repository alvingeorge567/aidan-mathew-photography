import "server-only";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NotAuthorizedError } from "@/lib/auth";
import type { ActionResult } from "@/lib/admin-types";

export function fail(error: string): ActionResult {
  return { ok: false, error };
}

export function toResult(e: unknown): ActionResult {
  if (e instanceof NotAuthorizedError) return fail(e.message);
  const msg = e instanceof Error ? e.message : String(e);
  console.error("admin action failed:", msg);
  return fail(msg || "Something went wrong. Nothing was changed.");
}

/** Database errors in plain language. */
export function dbError(err: { code?: string; message: string } | null, fallback: string): string {
  if (!err) return fallback;
  if (err.code === "23505") return "Another item already uses this URL name. Choose a different one.";
  if (err.code === "42501") return "You don't have permission to do that.";
  if (err.code === "P0001") return err.message; // raised by our database functions with a readable message
  return `${fallback} (${err.message})`;
}

export function revalidatePublic() {
  revalidatePath("/", "layout");
}

/** Records where each media asset is used so deletion and unpublishing can warn about references. */
export async function syncPlacements(db: SupabaseClient, entityType: string, entityId: string, mediaIds: string[]) {
  await db.from("media_placements").delete().eq("entity_type", entityType).eq("entity_id", entityId).eq("slot", "");
  const unique = [...new Set(mediaIds.filter(Boolean))];
  if (unique.length) {
    await db.from("media_placements").insert(unique.map((media_id) => ({ media_id, entity_type: entityType, entity_id: entityId, slot: "" })));
  }
}
