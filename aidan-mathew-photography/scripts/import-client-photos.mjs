#!/usr/bin/env node
/**
 * Copies the client photographs listed in shared/client-photos.json from the studio's current
 * website into this site's PRIVATE media library, then queues them for processing.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run media:import-client-photos
 *
 * Nothing is published. Each photo is imported with permission UNconfirmed and no alt text,
 * so the owner must confirm client consent and describe each photo before publishing it.
 * Empty photo slots in page and service DRAFTS are filled to match the development preview.
 * Running it again skips photos that were already imported.
 */
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY first.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const manifest = JSON.parse(await readFile(new URL("../shared/client-photos.json", import.meta.url), "utf8"));
const MAX_BYTES = Number(process.env.NEXT_PUBLIC_MAX_IMAGE_MB || 40) * 1024 * 1024;
const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const ids = {};
for (const photo of manifest.photos) {
  const filename = `client-photo-${photo.key}`;
  const { data: existing } = await db.from("media_assets").select("id").like("original_filename", `${filename}.%`).maybeSingle();
  if (existing) {
    ids[photo.key] = existing.id;
    console.log(`skip     ${photo.key} (already imported)`);
    continue;
  }

  const res = await fetch(photo.url);
  const type = (res.headers.get("content-type") || "").split(";")[0].trim();
  if (!res.ok || !TYPES[type]) {
    console.error(`failed   ${photo.key}: HTTP ${res.status} ${type}`);
    continue;
  }
  const body = Buffer.from(await res.arrayBuffer());
  if (body.length > MAX_BYTES) {
    console.error(`failed   ${photo.key}: larger than the ${MAX_BYTES / 1048576} MB limit`);
    continue;
  }
  const ext = TYPES[type];
  const now = new Date();
  const objectKey = `images/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.${ext}`;

  const up = await db.storage.from("media-originals").upload(objectKey, body, { contentType: type, upsert: false });
  if (up.error) {
    console.error(`failed   ${photo.key}: ${up.error.message}`);
    continue;
  }
  const { data: asset, error } = await db
    .from("media_assets")
    .insert({
      media_type: "image",
      title: photo.title,
      original_filename: `${filename}.${ext}`,
      original_key: objectKey,
      mime_type: type,
      byte_size: body.length,
      processing_status: "validating",
      permission_confirmed: false,
      permission_notes: `Imported from the previous website (${photo.gallery}). Confirm the client agreed to publication on the new site before publishing.`,
    })
    .select("id")
    .single();
  if (error) {
    console.error(`failed   ${photo.key}: ${error.message}`);
    await db.storage.from("media-originals").remove([objectKey]);
    continue;
  }
  await db.from("processing_jobs").insert({ media_id: asset.id, source_key: objectKey });
  await db.from("media_placements").upsert(
    { media_id: asset.id, entity_type: "portfolio", entity_id: "", slot: "", sort_order: manifest.photos.indexOf(photo) },
    { onConflict: "media_id,entity_type,entity_id,slot" },
  );
  ids[photo.key] = asset.id;
  console.log(`imported ${photo.key} → ${asset.id}`);
}

async function fillDraft(table, match, slots) {
  const { data: row } = await db.from(table).select("id, draft").match(match).maybeSingle();
  if (!row) return;
  const draft = { ...(row.draft || {}) };
  const placed = [];
  for (const [field, photoKey] of Object.entries(slots)) {
    if (!draft[field] && ids[photoKey]) {
      draft[field] = ids[photoKey];
      placed.push(ids[photoKey]);
    }
  }
  if (!placed.length) return;
  await db.from(table).update({ draft, has_unpublished_changes: true }).eq("id", row.id);
  const entityType = { pages: "page", services: "service" }[table];
  for (const media_id of placed) {
    await db.from("media_placements").upsert({ media_id, entity_type: entityType, entity_id: row.id, slot: "" }, { onConflict: "media_id,entity_type,entity_id,slot" });
  }
  console.log(`draft    ${table} ${Object.values(match)[0]}: filled ${placed.length} photo slot(s)`);
}

await fillDraft("pages", { key: "home" }, manifest.slots.home);
await fillDraft("pages", { key: "storytelling" }, { hero_image_id: manifest.slots.storytelling.hero_image_id });
for (const [slug, photoKey] of Object.entries(manifest.slots.services)) {
  await fillDraft("services", { slug }, { card_image_id: photoKey });
}
await db.from("audit_logs").insert({ action: "media.client_photos_imported", entity_type: "media", details: { count: Object.keys(ids).length } });

console.log(`
Done. ${Object.keys(ids).length} photo(s) are in the media library (private, not published).
Next, with the worker running:
  1. Admin → Media: wait for each photo to show Ready.
  2. Open each one: confirm client permission, add alt text, then Publish.
  3. Admin → Pages and Services: check the photos, then Publish.`);
