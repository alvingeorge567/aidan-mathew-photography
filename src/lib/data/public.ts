import "server-only";
import { cache } from "react";
import { publicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/env";
import { PAGE_DEFAULTS, type PageKey } from "@/lib/content/pages";
import { SETTINGS_DEFAULTS, type Settings, type StoryBlock } from "@/lib/content/entities";
import type { Values } from "@/lib/content/schema";
import { publicMediaUrl, resolveMedia, type DerivativeManifest, type MediaMap, type ResolvedMedia } from "@/lib/media";

export const getSettings = cache(async (): Promise<Settings> => {
  const db = publicClient();
  if (!db) return SETTINGS_DEFAULTS;
  const { data } = await db.from("public_settings").select("data").maybeSingle();
  const stored = (data?.data ?? {}) as Partial<Settings>;
  const merged = { ...SETTINGS_DEFAULTS, ...stored };
  if (!Array.isArray(merged.nav) || merged.nav.length === 0) merged.nav = SETTINGS_DEFAULTS.nav;
  return merged;
});

export type PageContent = { content: Values; published: boolean };

/** Published page content merged over defaults. Unpublished pages fall back to labelled defaults. */
export const getPage = cache(async (key: PageKey): Promise<PageContent> => {
  const db = publicClient();
  if (!db) return { content: PAGE_DEFAULTS[key], published: false };
  const { data } = await db.from("public_pages").select("content").eq("key", key).maybeSingle();
  if (!data?.content) return { content: PAGE_DEFAULTS[key], published: false };
  return { content: { ...PAGE_DEFAULTS[key], ...(data.content as Values) }, published: true };
});

/**
 * Demonstration mode: the database isn't connected or the homepage hasn't been published.
 * The site shows a banner so placeholder content is never mistaken for real business content.
 */
export const isDemoMode = cache(async (): Promise<boolean> => {
  if (!isSupabaseConfigured()) return true;
  return !(await getPage("home")).published;
});

type PublicMediaRow = Parameters<typeof resolveMedia>[0] & { public_prefix: string; derivatives: DerivativeManifest };

function toResolved(row: PublicMediaRow): ResolvedMedia {
  return resolveMedia(row, row.derivatives, (file) => publicMediaUrl(row.public_prefix, file));
}

const MEDIA_COLUMNS = "id, media_type, title, alt_text, caption, category, width, height, duration_seconds, focal_x, focal_y, public_prefix, derivatives";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getMedia(ids: (string | null | undefined)[]): Promise<MediaMap> {
  // Only database IDs (UUIDs) are looked up; other keys, such as preview client photos, are skipped.
  const unique = [...new Set(ids.filter((v): v is string => typeof v === "string" && UUID_RE.test(v)))];
  const db = publicClient();
  if (!db || unique.length === 0) return {};
  const { data } = await db.from("public_media").select(MEDIA_COLUMNS).in("id", unique);
  const map: MediaMap = {};
  for (const row of (data ?? []) as PublicMediaRow[]) map[row.id] = toResolved(row);
  return map;
}

export type PublishedEntity = { id: string; content: Values };

export const getServices = cache(async (): Promise<PublishedEntity[]> => {
  const db = publicClient();
  if (!db) return [];
  const { data } = await db.from("public_services").select("id, content").order("sort_order").order("published_at");
  return (data ?? []) as PublishedEntity[];
});

export async function getFilms(opts: { featuredOnly?: boolean; category?: string } = {}): Promise<PublishedEntity[]> {
  const db = publicClient();
  if (!db) return [];
  let q = db.from("public_films").select("id, content").order("sort_order").order("published_at", { ascending: false });
  if (opts.featuredOnly) q = q.eq("featured", true);
  if (opts.category) q = q.eq("content->>category", opts.category);
  const { data } = await q.limit(opts.featuredOnly ? 3 : 200);
  return (data ?? []) as PublishedEntity[];
}

export async function getFilmBySlug(slug: string): Promise<PublishedEntity | null> {
  const db = publicClient();
  if (!db) return null;
  const { data } = await db.from("public_films").select("id, content").eq("content->>slug", slug).maybeSingle();
  return (data as PublishedEntity) ?? null;
}

export async function getStories(category?: string): Promise<PublishedEntity[]> {
  const db = publicClient();
  if (!db) return [];
  let q = db.from("public_stories").select("id, content").order("sort_order").order("published_at", { ascending: false });
  if (category) q = q.eq("content->>category", category);
  const { data } = await q.limit(200);
  return (data ?? []) as PublishedEntity[];
}

export async function getStoryBySlug(slug: string): Promise<PublishedEntity | null> {
  const db = publicClient();
  if (!db) return null;
  const { data } = await db.from("public_stories").select("id, content").eq("content->>slug", slug).maybeSingle();
  return (data as PublishedEntity) ?? null;
}

export async function getStoryTitles(ids: string[]): Promise<Record<string, { title: string; slug: string }>> {
  const db = publicClient();
  if (!db || ids.length === 0) return {};
  const { data } = await db.from("public_stories").select("id, content").in("id", ids);
  const out: Record<string, { title: string; slug: string }> = {};
  for (const r of (data ?? []) as PublishedEntity[]) out[r.id] = { title: String(r.content.title ?? ""), slug: String(r.content.slug ?? "") };
  return out;
}

export type PublicReview = {
  id: string;
  display_name: string;
  review_text: string;
  rating: number | null;
  photo_media_id: string | null;
  featured: boolean;
  event_type: string;
};

export async function getReviews(opts: { featuredFirst?: boolean; limit?: number } = {}): Promise<PublicReview[]> {
  const db = publicClient();
  if (!db) return [];
  let q = db.from("public_reviews").select("id, display_name, review_text, rating, photo_media_id, featured, event_type");
  if (opts.featuredFirst) q = q.order("featured", { ascending: false });
  const { data } = await q.order("created_at", { ascending: false }).limit(opts.limit ?? 100);
  return (data ?? []) as PublicReview[];
}

export const PORTFOLIO_PAGE_SIZE = 24;

export async function getPortfolio(category: string | undefined, page: number): Promise<{ items: ResolvedMedia[]; total: number }> {
  const db = publicClient();
  if (!db) return { items: [], total: 0 };
  const from = (page - 1) * PORTFOLIO_PAGE_SIZE;
  let q = db.from("public_portfolio").select(MEDIA_COLUMNS, { count: "exact" }).eq("media_type", "image");
  if (category) q = q.eq("category", category);
  const { data, count } = await q
    .order("sort_order")
    .order("published_at", { ascending: false })
    .range(from, from + PORTFOLIO_PAGE_SIZE - 1);
  return { items: ((data ?? []) as PublicMediaRow[]).map(toResolved), total: count ?? 0 };
}

export function storyBlocksOf(content: Values): StoryBlock[] {
  return Array.isArray(content.blocks) ? (content.blocks as StoryBlock[]) : [];
}
