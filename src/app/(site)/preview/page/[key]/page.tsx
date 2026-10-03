import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getPreviewMedia } from "@/lib/data/admin";
import { getSettings, getStories, getMedia } from "@/lib/data/public";
import { collectMediaIds } from "@/lib/content/schema";
import { PAGE_SCHEMAS, PREVIEWABLE_PAGES, isPageKey, withPageDefaults } from "@/lib/content/pages";
import { HomeView } from "@/components/views/HomeView";
import { AboutView } from "@/components/views/AboutView";
import { StorytellingView } from "@/components/views/StorytellingView";
import { LegalView } from "@/components/views/LegalView";
import { loadHomeData } from "../../../home-data";

export default async function PreviewPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!isPageKey(key) || !PREVIEWABLE_PAGES.includes(key)) notFound();
  const { db } = await requireAdmin();
  const { data: row } = await db.from("pages").select("draft").eq("key", key).maybeSingle();
  const content = withPageDefaults(key, row?.draft);
  const draftMedia = await getPreviewMedia(db, collectMediaIds(PAGE_SCHEMAS[key], content));

  switch (key) {
    case "home": {
      const settings = await getSettings();
      const data = await loadHomeData(content, false, draftMedia);
      return <HomeView content={content} settings={settings} demo={false} {...data} />;
    }
    case "about":
      return <AboutView content={content} media={draftMedia} />;
    case "storytelling": {
      const stories = await getStories();
      const cards = stories.map((s) => ({
        slug: String(s.content.slug ?? ""), title: String(s.content.title ?? ""), couple: String(s.content.couple_names ?? ""),
        category: String(s.content.category ?? ""), coverId: String(s.content.cover_id ?? ""),
      }));
      const covers = await getMedia(cards.map((c) => c.coverId));
      const categories = ((content.categories as { name?: string }[]) ?? []).map((c) => c.name ?? "").filter(Boolean);
      return <StorytellingView content={content} media={{ ...covers, ...draftMedia }} stories={cards} categories={categories} />;
    }
    default:
      return <LegalView content={content} fallbackTitle={key === "privacy" ? "Privacy" : "Website Terms"} />;
  }
}
