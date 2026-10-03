import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { config } from "./config.ts";
import { db } from "./supabase.ts";
import { validateFile } from "./validate.ts";
import { buildImageDerivatives, buildVideoDerivatives } from "./derivatives.ts";
import { downloadTo, removeObject, removePrefix, uploadFile } from "./storage.ts";

const ORIGINALS = "media-originals";
const DERIVATIVES = "media-derivatives";

export type ProcessingJob = {
  id: string;
  media_id: string;
  source_key: string;
  replaces_key: string | null;
  attempts: number;
  max_attempts: number;
};

async function setAsset(id: string, fields: Record<string, unknown>) {
  const { error } = await db().from("media_assets").update(fields).eq("id", id);
  if (error) throw new Error(`Could not update media record: ${error.message}`);
}

async function finishJob(id: string, status: "succeeded" | "failed", lastError: string | null = null) {
  await db().from("processing_jobs").update({ status, last_error: lastError, finished_at: new Date().toISOString() }).eq("id", id);
}

/**
 * Uploading → Validating → Processing → Ready (or Failed).
 * Validation failures are permanent; infrastructure errors are retried with backoff.
 */
export async function processMediaJob(job: ProcessingJob) {
  const { data: asset } = await db().from("media_assets").select("*").eq("id", job.media_id).maybeSingle();
  if (!asset) return finishJob(job.id, "failed", "Media record no longer exists");

  const isReplacement = Boolean(job.replaces_key && job.replaces_key !== job.source_key);
  const hadGoodVersion = Boolean(asset.derivatives_prefix);
  const work = await mkdtemp(join(tmpdir(), "media-"));
  const log = (msg: string) => console.log(`[media ${asset.id}] ${msg}`);

  try {
    await setAsset(asset.id, { processing_status: "validating", error_message: null });
    const input = join(work, "original");
    await downloadTo(ORIGINALS, job.source_key, input);

    const v = await validateFile(input, asset.media_type, config.ffprobe);
    if (!v.ok) {
      log(`rejected: ${v.error}`);
      if (isReplacement && hadGoodVersion) {
        await setAsset(asset.id, { processing_status: "ready", error_message: `Replacement rejected: ${v.error} The previous version is unchanged.` });
        await removeObject(ORIGINALS, job.source_key);
      } else {
        await setAsset(asset.id, { processing_status: "failed", error_message: v.error });
      }
      return finishJob(job.id, "failed", v.error);
    }

    await setAsset(asset.id, { processing_status: "processing" });
    const out = join(work, "out");
    await mkdir(out);
    const built =
      v.kind === "video"
        ? await buildVideoDerivatives(input, out, {
            ffmpeg: config.ffmpeg, ffprobe: config.ffprobe, width: v.width, height: v.height, duration: v.duration ?? 0, hasAudio: Boolean(v.probe?.hasAudio),
          })
        : await buildImageDerivatives(input, out, v.width);

    const prefix = `${asset.id}/${job.id}`;
    for (const f of built.files) await uploadFile(DERIVATIVES, `${prefix}/${f.name}`, join(out, f.name), f.contentType);

    await setAsset(asset.id, {
      processing_status: "ready",
      error_message: null,
      mime_type: v.mime,
      byte_size: v.size,
      width: v.width,
      height: v.height,
      duration_seconds: v.duration,
      original_key: job.source_key,
      processed_key: `${prefix}/${built.mainFile}`,
      poster_key: built.posterFile ? `${prefix}/${built.posterFile}` : null,
      derivatives_prefix: prefix,
      derivatives: built.manifest,
      has_unpublished_changes: asset.publication_status === "published",
    });

    // The previous private derivatives and replaced original are no longer needed.
    // Public copies of a published version stay live until the admin publishes again.
    if (asset.derivatives_prefix && asset.derivatives_prefix !== prefix) await removePrefix(DERIVATIVES, asset.derivatives_prefix);
    if (isReplacement) await removeObject(ORIGINALS, job.replaces_key);
    await finishJob(job.id, "succeeded");
    log(`ready (${built.files.length} files)`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const final = job.attempts >= job.max_attempts;
    log(`error (attempt ${job.attempts}/${job.max_attempts}): ${msg}`);
    if (final) {
      await setAsset(asset.id, hadGoodVersion
        ? { processing_status: "ready", error_message: `Replacement failed: ${msg}. The previous version is unchanged.` }
        : { processing_status: "failed", error_message: `Processing failed: ${msg}` }).catch(() => undefined);
      await finishJob(job.id, "failed", msg);
    } else {
      await db()
        .from("processing_jobs")
        .update({ status: "queued", last_error: msg, run_after: new Date(Date.now() + 30_000 * job.attempts).toISOString() })
        .eq("id", job.id);
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}
