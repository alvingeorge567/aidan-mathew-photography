import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StoryView } from "@/components/views/StoryView";
import { blockMediaIds } from "@/components/site/StoryBlocksView";
import { getMedia, getSettings, getStoryBySlug, storyBlocksOf } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const [settings, story] = await Promise.all([getSettings(), getStoryBySlug(slug)]);
  if (!story) return { title: "Story not found" };
  return pageMetadata({
    settings,
    path: `/stories/${slug}`,
    fallbackTitle: String(story.content.title ?? "Wedding story"),
    fallbackDescription: String(story.content.seo_description || story.content.intro || "").slice(0, 170) || undefined,
    imageId: String(story.content.cover_id ?? ""),
  });
}

export default async function StoryPage({ params }: Params) {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  if (!story) notFound();
  const blocks = storyBlocksOf(story.content);
  const media = await getMedia([String(story.content.cover_id ?? ""), ...blockMediaIds(blocks)]);
  return <StoryView content={story.content} blocks={blocks} media={media} />;
}
