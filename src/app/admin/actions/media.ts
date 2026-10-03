"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { audit, requireAdminAction } from "@/lib/auth";
import { serviceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/admin-types";
import type { DerivativeManifest } from "@/lib/media";
import { classifyUpload, precheckFile } from "@shared/media-rules";
import { dbError, fail, revalidatePublic, toResult } from "./util";

const ORIGINALS = "media-originals";
const DERIVATIVES = "media-derivatives";
const PUBLIC = "media-public";
const KEY_PATTERN = /^(images|videos)\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.(jpg|png|webp|mp4|mov|webm)$/;

export type UploadTicket = ActionResult & { assetId?: string; bucket?: string; objectName?: string; contentType?: string };

/**
 * Step 1 of an upload. The server authorizes the upload, picks a generated storage key
 * (never the visitor's filename) and records the asset as "uploading". The browser then
 * uploads directly to private storage with the admin's own session (resumable TUS).
 */
export async function createUpload(input: { filename: string; size: number; mime: string; replaceAssetId?: string }): Promise<UploadTicket> {
  try {
    const admin = await requireAdminAction();
    const problem = precheckFile(input.filename, input.mime, input.size);
    if (problem) return fail(problem);
    const c = classifyUpload(input.filename, input.mime)!;
    const now = new Date();
    const objectName = `${c.kind}s/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.${c.ext}`;

    if (input.replaceAssetId) {
      const { data: asset } = await admin.db.from("media_assets").select("id, media_type").eq("id", input.replaceAssetId).maybeSingle();
      if (!asset) return fail("The media item you're replacing no longer exists.");
      if (asset.media_type !== c.kind) return fail(`Replace a ${asset.media_type} with another ${asset.media_type}.`);
      return { ok: true, assetId: asset.id, bucket: ORIGINALS, objectName, contentType: c.contentType };
    }

    const title = input.filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").slice(0, 200);
    const { data, error } = await admin.db
      .from("media_assets")
      .insert({
        media_type: c.kind,
        title,
        original_filename: input.filename.slice(0, 255),
        original_key: objectName,
        mime_type: c.contentType,
        byte_size: input.size,
        processing_status: "uploading",
        uploaded_by: admin.user.id,
      })
      .select("id")
      .single();
    if (error || !data) return fail(dbError(error, "The upload couldn't be started"));
    return { ok: true, assetId: data.id, bucket: ORIGINALS, objectName, contentType: c.contentType };
  } catch (e) {
    return toResult(e);
  }
}

/** Step 2: the upload finished. Confirm the object exists, then queue trusted validation and processing. */
export async function completeUpload(input: { assetId: string; objectName: string; replace?: boolean }): Promise<ActionResult> {
  try {
    const admin = await requireAdminAction();
    if (!KEY_PATTERN.test(input.objectName)) return fail("Unexpected storage key.");
    const { data: asset } = await admin.db.from("media_assets").select("id, original_key, processing_status").eq("id", input.assetId).maybeSingle();
    if (!asset) return fail("This media item no longer exists.");
    if (!input.replace && asset.original_key !== input.objectName) return fail("Upload does not match this media item.");

    const { data: exists } = await admin.db.storage.from(ORIGINALS).exists(input.objectName);
    if (!exists) return fail("The file didn't arrive in storage. Try the upload again.");

    const { error: jobError } = await admin.db.from("processing_jobs").insert({
      media_id: asset.id,
      source_key: input.objectName,
      replaces_key: input.replace ? asset.original_key : null,
    });
    if (jobError) return fail(dbError(jobError, "Processing couldn't be queued"));
    await admin.db.from("media_assets").update({ processing_status: "validating", error_message: null }).eq("id", asset.id);
    await audit(admin, input.replace ? "media.replaced" : "media.uploaded", "media", asset.id, { key: input.objectName });
    revalidatePath("/admin/media");
    return { ok: true, message: "Uploaded. Checking and processing now." };
  } catch (e) {
    return toResult(e);
  }
}

/** Cancelling a new upload removes the record and any partial object. */
export async function cancelUpload(assetId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdminAction();
    const { data: asset } = await admin.db.from("media_assets").select("id, original_key, processing_status").eq("id", assetId).maybeSingle();
    if (!asset) return { ok: true };
    if (asset.processing_status !== "uploading") return fail("This file has already been uploaded. Delete it from the library instead.");
    await admin.db.storage.from(ORIGINALS).remove([asset.original_key]);
    await admin.db.from("media_assets").delete().eq("id", assetId);
    revalidatePath("/admin/media");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function updateMedia(id: string, fields: Record<string, unknown>): Promise<ActionResult> {
  try {
    const admin = await requireAdminAction();
    const clamp = (v: unknown) => Math.min(100, Math.max(0, Math.round(Number(v) || 50)));
    const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
    const storyId = str(fields.story_id, 40);
    const update = {
      title: str(fields.title, 200),
      alt_text: str(fields.alt_text, 400),
      caption: str(fields.caption, 600),
      category: str(fields.category, 80),
      focal_x: clamp(fields.focal_x),
      focal_y: clamp(fields.focal_y),
      story_id: /^[0-9a-f-]{36}$/.test(storyId) ? storyId : null,
      permission_confirmed: fields.permission_confirmed === true,
      permission_notes: str(fields.permission_notes, 2000),
    };
    const { error } = await admin.db.from("media_assets").update(update).eq("id", id);
    if (error) return fail(dbError(error, "Changes couldn't be saved"));

    if (typeof fields.in_portfolio === "boolean") {
      if (fields.in_portfolio) {
        await admin.db.from("media_placements").upsert(
          { media_id: id, entity_type: "portfolio", entity_id: "", slot: "", sort_order: Math.round(Number(fields.portfolio_order) || 0) },
          { onConflict: "media_id,entity_type,entity_id,slot" },
        );
      } else {
        await admin.db.from("media_placements").delete().eq("media_id", id).eq("entity_type", "portfolio");
      }
    }
    await audit(admin, "media.updated", "media", id);
    revalidatePublic();
    return { ok: true, message: "Saved." };
  } catch (e) {
    return toResult(e);
  }
}

function manifestFiles(m: DerivativeManifest | null): string[] {
  if (!m) return [];
  return [...(m.images ?? []), ...(m.videos ?? []), ...(m.poster ?? [])].map((f) => f.file);
}

async function removePrefix(bucket: string, prefix: string | null) {
  const svc = serviceClient();
  if (!svc || !prefix) return;
  const { data } = await svc.storage.from(bucket).list(prefix, { limit: 1000 });
  const paths = (data ?? []).map((f) => `${prefix}/${f.name}`);
  if (paths.length) await svc.storage.from(bucket).remove(paths);
}

/**
 * Publishing copies the optimized derivatives (never the original) into the public bucket
 * under a fresh random prefix. Uploading alone never makes anything public.
 */
export async function publishMedia(id: string): Promise<ActionResult> {
  try {
    const admin = await requireAdminAction();
    const svc = serviceClient();
    if (!svc) return fail("Publishing needs SUPABASE_SERVICE_ROLE_KEY on the server. See docs/DEPLOYMENT.md.");
    const { data: a } = await admin.db.from("media_assets").select("*").eq("id", id).maybeSingle();
    if (!a) return fail("This media item no longer exists.");
    if (a.processing_status !== "ready") return fail("Only media marked Ready can be published.");
    if (!a.permission_confirmed) return fail("Confirm that you have permission to publish this media first.");
    if (a.media_type === "image" && !String(a.alt_text ?? "").trim()) return fail("Add alt text describing the photograph before publishing.");
    const files = manifestFiles(a.derivatives);
    if (!a.derivatives_prefix || !files.length) return fail("Processed files are missing. Retry processing.");

    const prefix = `${a.id}/${randomBytes(8).toString("hex")}`;
    const copied: string[] = [];
    for (const file of files) {
      const { error } = await svc.storage.from(DERIVATIVES).copy(`${a.derivatives_prefix}/${file}`, `${prefix}/${file}`, { destinationBucket: PUBLIC });
      if (error) {
        if (copied.length) await svc.storage.from(PUBLIC).remove(copied);
        return fail(`Publishing failed while copying files (${error.message}). Nothing was published.`);
      }
      copied.push(`${prefix}/${file}`);
    }
    const previous = a.public_prefix as string | null;
    const { error } = await admin.db
      .from("media_assets")
      .update({
        publication_status: "published",
        public_prefix: prefix,
        public_derivatives: a.derivatives,
        has_unpublished_changes: false,
        published_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      await svc.storage.from(PUBLIC).remove(copied);
      return fail(dbError(error, "Publishing failed"));
    }
    if (previous && previous !== prefix) await removePrefix(PUBLIC, previous);
    await audit(admin, "media.published", "media", id);
    revalidatePublic();
    revalidatePath("/admin/media");
    return { ok: true, message: "Published. Visitors can now see this wherever it is placed." };
  } catch (e) {
    return toResult(e);
  }
}

async function describeReferences(db: Awaited<ReturnType<typeof requireAdminAction>>["db"], mediaId: string): Promise<string[]> {
  const { data } = await db.from("media_placements").select("entity_type, entity_id").eq("media_id", mediaId);
  const refs: string[] = [];
  for (const p of data ?? []) {
    if (p.entity_type === "portfolio") refs.push("Portfolio");
    else if (p.entity_type === "settings") refs.push("Site settings");
    else if (p.entity_type === "page") {
      const { data: pg } = await db.from("pages").select("title, status").eq("id", p.entity_id).maybeSingle();
      refs.push(`Page: ${pg?.title ?? "unknown"}${pg?.status === "published" ? " (live)" : ""}`);
    } else {
      const table = { service: "services", film: "films", story: "stories" }[p.entity_type as "service" | "film" | "story"];
      if (!table) continue;
      const { data: row } = await db.from(table).select("draft, status").eq("id", p.entity_id).maybeSingle();
      refs.push(`${p.entity_type[0].toUpperCase()}${p.entity_type.slice(1)}: ${row?.draft?.title ?? "untitled"}${row?.status === "published" ? " (live)" : ""}`);
    }
  }
  return refs;
}

export async function unpublishMedia(id: string, confirmed = false): Promise<ActionResult> {
  try {
    const admin = await requireAdminAction();
    const refs = await describeReferences(admin.db, id);
    if (refs.length && !confirmed) {
      return { ok: false, needsConfirm: true, references: refs, error: "This media is used on the site. Unpublishing will remove it from these places:" };
    }
    const { data: a } = await admin.db.from("media_assets").select("public_prefix").eq("id", id).maybeSingle();
    const { error } = await admin.db
      .from("media_assets")
      .update({ publication_status: "unpublished", public_prefix: null, public_derivatives: null })
      .eq("id", id);
    if (error) return fail(dbError(error, "Unpublishing failed"));
    await removePrefix(PUBLIC, a?.public_prefix ?? null);
    await audit(admin, "media.unpublished", "media", id);
    revalidatePublic();
    revalidatePath("/admin/media");
    return { ok: true, message: "Unpublished. Public copies were removed; cached copies may persist briefly (see the admin guide)." };
  } catch (e) {
    return toResult(e);
  }
}

export async function deleteMedia(id: string, confirmed = false): Promise<ActionResult> {
  try {
    const admin = await requireAdminAction();
    const svc = serviceClient();
    if (!svc) return fail("Deleting needs SUPABASE_SERVICE_ROLE_KEY on the server.");
    const refs = await describeReferences(admin.db, id);
    if (refs.length && !confirmed) {
      return { ok: false, needsConfirm: true, references: refs, error: "This media is used on the site. Deleting it will remove it from:" };
    }
    const { data: a } = await admin.db.from("media_assets").select("original_key, derivatives_prefix, public_prefix").eq("id", id).maybeSingle();
    if (!a) return { ok: true };
    const { error } = await admin.db.from("media_assets").delete().eq("id", id);
    if (error) return fail(dbError(error, "Delete failed"));
    await svc.storage.from(ORIGINALS).remove([a.original_key]);
    await removePrefix(DERIVATIVES, a.derivatives_prefix);
    await removePrefix(PUBLIC, a.public_prefix);
    await audit(admin, "media.deleted", "media", id, { original_key: a.original_key });
    revalidatePublic();
    revalidatePath("/admin/media");
    return { ok: true, message: "Deleted." };
  } catch (e) {
    return toResult(e);
  }
}

export async function retryProcessing(id: string): Promise<ActionResult> {
  try {
    const admin = await requireAdminAction();
    const { data: a } = await admin.db.from("media_assets").select("id, original_key, processing_status").eq("id", id).maybeSingle();
    if (!a) return fail("This media item no longer exists.");
    if (a.processing_status === "uploading") return fail("The upload never finished. Delete this item and upload again.");
    const { error } = await admin.db.from("processing_jobs").insert({ media_id: id, source_key: a.original_key });
    if (error) return fail(dbError(error, "Couldn't queue processing"));
    await admin.db.from("media_assets").update({ processing_status: "validating", error_message: null }).eq("id", id);
    await audit(admin, "media.reprocess", "media", id);
    revalidatePath("/admin/media");
    return { ok: true, message: "Queued for processing." };
  } catch (e) {
    return toResult(e);
  }
}
