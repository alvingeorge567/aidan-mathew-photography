import type { Metadata } from "next";
import Link from "next/link";
import { getMedia, getPage, getServices, getSettings } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";
import { PageIntro } from "@/components/site/PageIntro";
import { MediaImage } from "@/components/site/MediaImage";
import { Prose, text } from "@/components/site/Prose";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([getSettings(), getPage("services")]);
  return pageMetadata({ settings, content: page.content, path: "/services", fallbackTitle: "Services" });
}

const s = (v: unknown) => (typeof v === "string" ? v : "");

export default async function ServicesPage() {
  const [page, services] = await Promise.all([getPage("services"), getServices()]);
  const c = page.content;
  const media = await getMedia(services.flatMap((x) => [s(x.content.detail_image_id), s(x.content.card_image_id)]));
  const faq = ((c.faq as { question?: string; answer?: string }[]) ?? []).filter((f) => f.question && f.answer);

  return (
    <>
      <PageIntro title={text(c.heading, "Services")} intro={<Prose text={c.intro} />} />
      {services.length ? (
        <nav aria-label="Services on this page" className="border-y border-stone bg-ivory">
          <ul className="container-x flex gap-6 overflow-x-auto py-4 text-sm">
            {services.map((x) => (
              <li key={x.id} className="shrink-0">
                <a href={`#${s(x.content.slug)}`} className="inline-flex min-h-[40px] items-center hover:underline">{s(x.content.title)}</a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <div className="bg-ivory">
        {services.length === 0 ? (
          <p className="container-x py-20">Service details will appear here once the studio publishes them.</p>
        ) : (
          services.map((x, i) => {
            const d = x.content;
            const img = media[s(d.detail_image_id)] ?? media[s(d.card_image_id)];
            const deliverables = ((d.deliverables as { item?: string }[]) ?? []).map((v) => v.item).filter(Boolean);
            return (
              <section key={x.id} id={s(d.slug)} className="scroll-mt-24 border-b border-stone py-20 sm:py-28" aria-labelledby={`svc-${x.id}`}>
                <div className="container-x grid items-start gap-12 lg:grid-cols-2 lg:gap-20">
                  <div className={`aspect-[4/5] overflow-hidden ${i % 2 ? "lg:order-2" : ""}`}>
                    <MediaImage media={img} sizes="(min-width: 1024px) 45vw, 100vw" className="h-full w-full" />
                  </div>
                  <div>
                    <h2 id={`svc-${x.id}`} className="font-serif text-4xl font-light sm:text-5xl">{s(d.title)}</h2>
                    {s(d.package_name) || (d.show_price === true && s(d.starting_price)) ? (
                      <p className="mt-4 text-bronze">
                        {[s(d.package_name), d.show_price === true ? s(d.starting_price) : ""].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                    {s(d.experience) ? (
                      <div className="mt-8">
                        <h3 className="text-sm font-semibold">The experience</h3>
                        <Prose text={d.experience} className="mt-3 max-w-prose leading-relaxed" />
                      </div>
                    ) : s(d.summary) ? (
                      <p className="mt-8 max-w-prose leading-relaxed">{s(d.summary)}</p>
                    ) : null}
                    {deliverables.length ? (
                      <div className="mt-8">
                        <h3 className="text-sm font-semibold">What you receive</h3>
                        <ul className="mt-3 space-y-2">
                          {deliverables.map((item, j) => (
                            <li key={j} className="flex gap-3">
                              <span className="mt-3 h-px w-4 shrink-0 bg-champagne" aria-hidden="true" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {s(d.next_steps) ? (
                      <div className="mt-8">
                        <h3 className="text-sm font-semibold">Next steps</h3>
                        <Prose text={d.next_steps} className="mt-3 max-w-prose leading-relaxed" />
                      </div>
                    ) : null}
                    <Link href={`/booking?service=${encodeURIComponent(s(d.slug))}`} className="btn btn-dark mt-10">
                      Check availability for {s(d.title)}
                    </Link>
                  </div>
                </div>
              </section>
            );
          })
        )}
      </div>
      {faq.length ? (
        <section className="bg-ivory py-20 sm:py-28" aria-labelledby="faq-title">
          <div className="container-x max-w-4xl">
            <h2 id="faq-title" className="font-serif text-4xl font-light">{text(c.faq_heading, "Questions Couples Ask")}</h2>
            <div className="mt-10 divide-y divide-stone border-y border-stone">
              {faq.map((f, i) => (
                <details key={i} className="group py-5">
                  <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-6 font-serif text-xl">
                    {f.question}
                    <span className="text-2xl text-bronze transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <Prose text={f.answer} className="mt-4 max-w-prose leading-relaxed" />
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
