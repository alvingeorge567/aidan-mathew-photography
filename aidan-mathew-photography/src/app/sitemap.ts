import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { publicClient } from "@/lib/supabase/public";
import { PAGE_PATHS, type PageKey } from "@/lib/content/pages";

export const revalidate = 3600;

/** Only published public pages, stories and films. Admin and preview routes are never listed. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = publicClient();
  if (!db) return [{ url: `${env.siteUrl}/` }];
  const [pages, stories, films] = await Promise.all([
    db.from("public_pages").select("key, published_at"),
    db.from("public_stories").select("content, published_at"),
    db.from("public_films").select("content, published_at"),
  ]);
  const entries: MetadataRoute.Sitemap = [];
  for (const p of pages.data ?? []) {
    const path = PAGE_PATHS[p.key as PageKey];
    if (path) entries.push({ url: `${env.siteUrl}${path}`, lastModified: p.published_at ?? undefined });
  }
  for (const s of stories.data ?? []) entries.push({ url: `${env.siteUrl}/stories/${s.content?.slug}`, lastModified: s.published_at ?? undefined });
  for (const f of films.data ?? []) entries.push({ url: `${env.siteUrl}/films/${f.content?.slug}`, lastModified: f.published_at ?? undefined });
  return entries;
}
