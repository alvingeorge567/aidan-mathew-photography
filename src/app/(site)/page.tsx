import type { Metadata } from "next";
import { HomeView } from "@/components/views/HomeView";
import { getPage, getSettings, isDemoMode } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";
import { loadHomeData } from "./home-data";
import { CLIENT_PHOTO_SLOTS, fillEmpty } from "@/lib/client-photos";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([getSettings(), getPage("home")]);
  return pageMetadata({ settings, content: page.content, path: "/", fallbackTitle: settings.default_title, imageId: String(page.content.hero_image_id ?? ""), absoluteTitle: true });
}

export default async function HomePage() {
  const [settings, page, demo] = await Promise.all([getSettings(), getPage("home"), isDemoMode()]);
  const content = demo ? fillEmpty(page.content, CLIENT_PHOTO_SLOTS.home) : page.content;
  const data = await loadHomeData(content, demo);
  return <HomeView content={content} settings={settings} demo={demo} {...data} />;
}
