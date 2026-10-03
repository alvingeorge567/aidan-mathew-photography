import type { Metadata } from "next";
import { getPage, getSettings } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";
import { LegalView } from "@/components/views/LegalView";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([getSettings(), getPage("privacy")]);
  return pageMetadata({ settings, content: page.content, path: "/privacy", fallbackTitle: "Privacy" });
}

export default async function Page() {
  const page = await getPage("privacy");
  return <LegalView content={page.content} fallbackTitle="Privacy" />;
}
