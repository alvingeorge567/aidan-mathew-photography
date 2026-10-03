import { createWriteStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { db } from "./supabase.ts";

/** Streams a private object to disk via a short-lived signed URL (no full-file buffering). */
export async function downloadTo(bucket: string, key: string, dest: string) {
  const { data, error } = await db().storage.from(bucket).createSignedUrl(key, 600);
  if (error || !data) throw new Error(`Original file not found in storage (${error?.message ?? "no URL"})`);
  const res = await fetch(data.signedUrl);
  if (!res.ok || !res.body) throw new Error(`Download failed with HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body as import("node:stream/web").ReadableStream), createWriteStream(dest));
}

export async function uploadFile(bucket: string, key: string, path: string, contentType: string) {
  const body = await readFile(path);
  const { error } = await db().storage.from(bucket).upload(key, body, { contentType, upsert: true, cacheControl: "3600" });
  if (error) throw new Error(`Upload of ${key} failed: ${error.message}`);
}

export async function removePrefix(bucket: string, prefix: string | null | undefined) {
  if (!prefix) return;
  const { data } = await db().storage.from(bucket).list(prefix, { limit: 1000 });
  const paths = (data ?? []).map((f) => `${prefix}/${f.name}`);
  if (paths.length) await db().storage.from(bucket).remove(paths);
}

export async function removeObject(bucket: string, key: string | null | undefined) {
  if (key) await db().storage.from(bucket).remove([key]);
}
