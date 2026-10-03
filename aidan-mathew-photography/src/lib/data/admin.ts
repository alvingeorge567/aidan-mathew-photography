import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MediaOption } from "@/lib/admin-types";
import { resolveMedia, type DerivativeManifest, type MediaMap } from "@/lib/media";

type AssetRow = {
  id: string;
  media_type: "image" | "video";
  title: string;
  original_filename?: string;
  derivatives_prefix: string | null;
  derivatives: DerivativeManifest | null;
  publication_status?: string;
  duration_seconds?: number | string | null;
};

/** Smallest preview image for each asset, as a short-lived signed URL from the private bucket. */
export async function signedThumbs(db: SupabaseClient, rows: AssetRow[], expiresIn = 3600): Promise<Record<string, string>> {
  const paths: { id: string; path: string }[] = [];
  for (const r of rows) {
    const m = r.derivatives;
    const list = (r.media_type === "image" ? m?.images : m?.poster) ?? [];
    const small = [...list].sort((a, b) => a.w - b.w).find((x) => x.w >= 400) ?? list[0];
    if (r.derivatives_prefix && small) paths.push({ id: r.id, path: `${r.derivatives_prefix}/${small.file}` });
  }
  if (!paths.length) return {};
  const { data } = await db.storage.from("media-derivatives").createSignedUrls(paths.map((p) => p.path), expiresIn);
  const out: Record<string, string> = {};
  (data ?? []).forEach((d, i) => {
    if (d.signedUrl) out[paths[i].id] = d.signedUrl;
  });
  return out;
}

/** Ready media available for placement in editors. */
export async function getMediaOptions(db: SupabaseClient): Promise<MediaOption[]> {
  const { data } = await db
    .from("media_assets")
    .select("id, media_type, title, original_filename, derivatives_prefix, derivatives, publication_status, duration_seconds")
    .eq("processing_status", "ready")
    .order("created_at", { ascending: false })
    .limit(1000);
  const rows = (data ?? []) as AssetRow[];
  const thumbs = await signedThumbs(db, rows);
  return rows.map((r) => ({
    id: r.id,
    title: r.title || r.original_filename || "Untitled",
    type: r.media_type,
    thumb: thumbs[r.id] ?? null,
    published: r.publication_status === "published",
    duration: r.duration_seconds == null ? null : Number(r.duration_seconds),
  }));
}

/** Draft previews use the private derivatives through signed URLs, so unpublished media can be previewed safely. */
export async function getPreviewMedia(db: SupabaseClient, ids: string[]): Promise<MediaMap> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return {};
  const { data } = await db
    .from("media_assets")
    .select("id, media_type, title, alt_text, caption, category, width, height, duration_seconds, focal_x, focal_y, derivatives_prefix, derivatives")
    .in("id", unique)
    .eq("processing_status", "ready");
  const rows = (data ?? []) as (AssetRow & Parameters<typeof resolveMedia>[0])[];
  const paths: string[] = [];
  for (const r of rows) {
    const m = r.derivatives ?? {};
    for (const f of [...(m.images ?? []), ...(m.poster ?? []), ...(m.videos ?? [])]) paths.push(`${r.derivatives_prefix}/${f.file}`);
  }
  const signed: Record<string, string> = {};
  if (paths.length) {
    const { data: urls } = await db.storage.from("media-derivatives").createSignedUrls(paths, 3600);
    (urls ?? []).forEach((u, i) => {
      if (u.signedUrl) signed[paths[i]] = u.signedUrl;
    });
  }
  const map: MediaMap = {};
  for (const r of rows) map[r.id] = resolveMedia(r, r.derivatives, (file) => signed[`${r.derivatives_prefix}/${file}`] ?? "");
  return map;
}

export async function countRows(db: SupabaseClient, table: string, filter?: (q: any) => any): Promise<number | null> {
  let q = db.from(table).select("id", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count, error } = await q;
  return error ? null : (count ?? 0);
}
