import type { Metadata } from "next";
import { AboutView } from "@/components/views/AboutView";
import { collectMediaIds } from "@/lib/content/schema";
import { PAGE_SCHEMAS } from "@/lib/content/pages";
import { getMedia, getPage, getSettings } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([getSettings(), getPage("about")]);
  return pageMetadata({ settings, content: page.content, path: "/about", fallbackTitle: "The Story Behind the Lens" });
}

export default async function AboutPage() {
  const page = await getPage("about");
  const media = await getMedia(collectMediaIds(PAGE_SCHEMAS.about, page.content));
  return <AboutView content={page.content} media={media} />;
}
