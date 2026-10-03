import type { Metadata } from "next";
import { getPage, getServices, getSettings } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";
import { BookingForm } from "@/components/site/BookingForm";
import { Prose, text } from "@/components/site/Prose";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([getSettings(), getPage("booking")]);
  return pageMetadata({ settings, content: page.content, path: "/booking", fallbackTitle: "Check Availability" });
}

const names = (v: unknown) => ((v as { name?: string }[]) ?? []).map((x) => x.name ?? "").filter(Boolean);

export default async function BookingPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service } = await searchParams;
  const [page, services, settings] = await Promise.all([getPage("booking"), getServices(), getSettings()]);
  const c = page.content;
  return (
    <section className="bg-ivory pb-24 pt-36 sm:pt-44">
      <div className="container-x grid gap-16 lg:grid-cols-[1fr_1.6fr] lg:gap-24">
        <div>
          <h1 className="font-serif text-5xl font-light leading-[1.05] sm:text-6xl">{text(c.heading, "Let’s Begin Your Story.")}</h1>
          <Prose text={c.intro} className="mt-8 max-w-md text-lg" />
          {settings.email ? (
            <p className="mt-10 text-sm">
              Prefer email? Write to <a href={`mailto:${settings.email}`} className="underline underline-offset-4">{settings.email}</a>.
            </p>
          ) : null}
        </div>
        <BookingForm
          eventTypes={names(c.event_types).length ? names(c.event_types) : ["Wedding", "Other"]}
          budgetRanges={names(c.budget_ranges)}
          referralSources={names(c.referral_sources)}
          services={services.map((x) => ({ slug: String(x.content.slug ?? ""), title: String(x.content.title ?? "") }))}
          preselectedService={service}
        />
      </div>
    </section>
  );
}
