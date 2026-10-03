import { config } from "./config.ts";
import { db } from "./supabase.ts";
import { removeObject } from "./storage.ts";

/**
 * Abandoned uploads: records still "uploading" after ABANDONED_UPLOAD_HOURS (default 24) are
 * removed with any partial object. Unfinished resumable sessions also expire in Supabase after 24h.
 */
export async function cleanAbandonedUploads() {
  const cutoff = new Date(Date.now() - config.abandonedUploadHours * 3600_000).toISOString();
  const { data } = await db().from("media_assets").select("id, original_key").eq("processing_status", "uploading").lt("created_at", cutoff).limit(200);
  for (const a of data ?? []) {
    await removeObject("media-originals", a.original_key).catch(() => undefined);
    await db().from("media_assets").delete().eq("id", a.id);
    await db().from("audit_logs").insert({ action: "media.abandoned_upload_removed", entity_type: "media", entity_id: a.id, details: { key: a.original_key } });
  }
  if (data?.length) console.log(`[maintenance] removed ${data.length} abandoned upload(s)`);
}

/** Optional automatic retention purge (off by default). See docs/OPERATIONS.md. */
export async function purgePersonalData() {
  if (!config.retention.autoPurge) return;
  const { data, error } = await db().rpc("purge_personal_data", { p_days: config.retention.days });
  if (error) console.error("[maintenance] purge failed:", error.message);
  else console.log("[maintenance] purge:", JSON.stringify(data));
}
