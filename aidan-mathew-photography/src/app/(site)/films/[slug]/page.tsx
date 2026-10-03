import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FilmView } from "@/components/views/FilmView";
import { getFilmBySlug, getMedia, getSettings, getStoryTitles } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";
import { env } from "@/lib/env";

export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const [settings, film] = await Promise.all([getSettings(), getFilmBySlug(slug)]);
  if (!film) return { title: "Film not found" };
  return pageMetadata({
    settings,
    path: `/films/${slug}`,
    fallbackTitle: String(film.content.title ?? "Film"),
    fallbackDescription: String(film.content.description ?? "").slice(0, 170) || undefined,
    imageId: String(film.content.poster_id || film.content.video_id || ""),
  });
}

export default async function FilmPage({ params }: Params) {
  const { slug } = await params;
  const film = await getFilmBySlug(slug);
  if (!film) notFound();
  const c = film.content;
  const storyId = String(c.story_id ?? "");
  const [media, stories] = await Promise.all([
    getMedia([String(c.video_id ?? ""), String(c.poster_id ?? "")]),
    getStoryTitles(storyId ? [storyId] : []),
  ]);
  const video = media[String(c.video_id ?? "")];
  const still = media[String(c.poster_id ?? "")] ?? video;
  const jsonLd = video
    ? {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: String(c.title ?? ""),
        description: String(c.description || c.title || ""),
        thumbnailUrl: still?.images.at(-1)?.url,
        contentUrl: video.videos.at(-1)?.url,
        duration: video.duration ? `PT${Math.round(video.duration)}S` : undefined,
        url: `${env.siteUrl}/films/${slug}`,
      }
    : null;
  return (
    <>
      <FilmView content={c} media={media} story={stories[storyId] ?? null} />
      {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} /> : null}
    </>
  );
}
