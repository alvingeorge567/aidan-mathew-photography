#!/usr/bin/env node
/**
 * Backs up (or restores) original uploads in the private media-originals bucket.
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/backup-media.mjs ./media-backup
 *   ... node scripts/backup-media.mjs --restore ./media-backup
 */
import { createWriteStream } from "node:fs";
import { mkdir, readdir, readFile, stat } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const restore = process.argv.includes("--restore");
const dir = process.argv.filter((a) => !a.startsWith("--"))[2];
if (!dir) {
  console.error("Usage: node scripts/backup-media.mjs [--restore] <folder>");
  process.exit(1);
}
const BUCKET = "media-originals";
const db = createClient(url, key, { auth: { persistSession: false } });

async function listAll(prefix = "") {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.storage.from(BUCKET).list(prefix, { limit: 1000, offset });
    if (error) throw error;
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) out.push({ path, size: item.metadata?.size ?? 0 });
      else out.push(...(await listAll(path)));
    }
    if (data.length < 1000) break;
  }
  return out;
}

async function walk(folder) {
  const out = [];
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const p = join(folder, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

if (restore) {
  const files = await walk(dir);
  for (const file of files) {
    const path = relative(dir, file).split("\\").join("/");
    const { error } = await db.storage.from(BUCKET).upload(path, await readFile(file), { upsert: false });
    console.log(error ? `skip ${path}: ${error.message}` : `restored ${path}`);
  }
} else {
  const objects = await listAll();
  let downloaded = 0;
  for (const o of objects) {
    const dest = join(dir, o.path);
    const existing = await stat(dest).catch(() => null);
    if (existing && existing.size === o.size) continue;
    await mkdir(dirname(dest), { recursive: true });
    const { data } = await db.storage.from(BUCKET).createSignedUrl(o.path, 600);
    const res = await fetch(data.signedUrl);
    if (!res.ok) {
      console.error(`failed ${o.path}: HTTP ${res.status}`);
      continue;
    }
    await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
    downloaded++;
  }
  console.log(`${objects.length} originals in storage; ${downloaded} downloaded this run.`);
}
