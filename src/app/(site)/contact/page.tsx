import type { Metadata } from "next";
import { getPage, getSettings } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";
import { InquiryForm } from "@/components/site/InquiryForm";
import { Prose, text } from "@/components/site/Prose";
import { SocialLinks } from "@/components/site/SiteFooter";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([getSettings(), getPage("contact")]);
  return pageMetadata({ settings, content: page.content, path: "/contact", fallbackTitle: "Contact" });
}

export default async function ContactPage() {
  const [page, settings] = await Promise.all([getPage("contact"), getSettings()]);
  const c = page.content;
  const types = ((c.inquiry_types as { name?: string }[]) ?? []).map((x) => x.name ?? "").filter(Boolean);
  return (
    <section className="bg-ivory pb-24 pt-36 sm:pt-44">
      <div className="container-x grid gap-16 lg:grid-cols-[1fr_1.4fr] lg:gap-24">
        <div>
          <h1 className="font-serif text-5xl font-light leading-[1.05] sm:text-6xl">{text(c.heading, "Tell Us About Your Story.")}</h1>
          <Prose text={c.intro} className="mt-8 max-w-md text-lg" />
          <dl className="mt-12 space-y-6">
            {settings.email ? (
              <div>
                <dt className="text-sm text-bronze">Email</dt>
                <dd className="mt-1 text-lg"><a href={`mailto:${settings.email}`} className="underline-offset-4 hover:underline">{settings.email}</a></dd>
              </div>
            ) : null}
            {settings.phone ? (
              <div>
                <dt className="text-sm text-bronze">Phone</dt>
                <dd className="mt-1 text-lg"><a href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`} className="underline-offset-4 hover:underline">{settings.phone}</a></dd>
              </div>
            ) : null}
            {settings.service_area ? (
              <div>
                <dt className="text-sm text-bronze">Service area</dt>
                <dd className="mt-1 text-lg">{settings.service_area}</dd>
              </div>
            ) : null}
          </dl>
          <SocialLinks settings={settings} className="mt-10 text-body" />
        </div>
        <InquiryForm inquiryTypes={types} />
      </div>
    </section>
  );
}
