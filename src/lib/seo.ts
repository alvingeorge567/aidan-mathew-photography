import type { Metadata } from "next";
import type { Settings } from "@/lib/content/entities";
import type { Values } from "@/lib/content/schema";
import { env } from "@/lib/env";
import { getMedia } from "@/lib/data/public";
import { pickImage } from "@/lib/media";

export async function pageMetadata(opts: {
  settings: Settings;
  content?: Values;
  path: string;
  fallbackTitle: string;
  fallbackDescription?: string;
  imageId?: string;
  absoluteTitle?: boolean;
}): Promise<Metadata> {
  const { settings, content = {}, path } = opts;
  const title = (typeof content.seo_title === "string" && content.seo_title) || opts.fallbackTitle;
  const description =
    (typeof content.seo_description === "string" && content.seo_description) || opts.fallbackDescription || settings.default_description;
  const imageId = (typeof content.seo_image_id === "string" && content.seo_image_id) || opts.imageId || settings.share_image_id;
  const media = imageId ? (await getMedia([imageId]))[imageId] : undefined;
  const img = media ? pickImage(media, 1200) : null;
  return {
    title: opts.absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: `${env.siteUrl}${path}` },
    openGraph: {
      title,
      description,
      url: `${env.siteUrl}${path}`,
      siteName: settings.business_name,
      type: "website",
      images: img ? [{ url: img.url, width: img.w, height: img.h }] : undefined,
    },
    twitter: { card: img ? "summary_large_image" : "summary", title, description },
  };
}
