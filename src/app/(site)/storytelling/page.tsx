import type { Metadata } from "next";
import { StorytellingView, type StoryCard } from "@/components/views/StorytellingView";
import { collectMediaIds } from "@/lib/content/schema";
import { PAGE_SCHEMAS } from "@/lib/content/pages";
import { getMedia, getPage, getSettings, getStories, isDemoMode } from "@/lib/data/public";
import { clientPhotoMedia, fillStorytelling } from "@/lib/client-photos";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([getSettings(), getPage("storytelling")]);
  return pageMetadata({ settings, content: page.content, path: "/storytelling", fallbackTitle: "Wedding Storytelling" });
}

export default async function StorytellingPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const [page, demo] = await Promise.all([getPage("storytelling"), isDemoMode()]);
  const content = demo && !page.published ? fillStorytelling(page.content) : page.content;
  const categories = ((page.content.categories as { name?: string }[]) ?? []).map((c) => c.name ?? "").filter(Boolean);
  const active = category && categories.includes(category) ? category : undefined;
  const stories = await getStories(active);
  const cards: StoryCard[] = stories.map((s) => ({
    slug: String(s.content.slug ?? ""),
    title: String(s.content.title ?? ""),
    couple: String(s.content.couple_names ?? ""),
    category: String(s.content.category ?? ""),
    coverId: String(s.content.cover_id ?? ""),
  }));
  const media = { ...(demo ? clientPhotoMedia() : {}), ...(await getMedia([...collectMediaIds(PAGE_SCHEMAS.storytelling, content), ...cards.map((c) => c.coverId)])) };
  return <StorytellingView content={content} media={media} stories={cards} categories={categories} activeCategory={active} />;
}
