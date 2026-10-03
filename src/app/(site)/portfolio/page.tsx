import type { Metadata } from "next";
import Link from "next/link";
import { getPage, getPortfolio, getSettings, isDemoMode, PORTFOLIO_PAGE_SIZE } from "@/lib/data/public";
import { clientPhotoList } from "@/lib/client-photos";
import { pageMetadata } from "@/lib/seo";
import { PageIntro } from "@/components/site/PageIntro";
import { Prose, text } from "@/components/site/Prose";
import { Gallery } from "@/components/site/Gallery";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([getSettings(), getPage("portfolio")]);
  return pageMetadata({ settings, content: page.content, path: "/portfolio", fallbackTitle: "Portfolio" });
}

type Search = { searchParams: Promise<{ category?: string; page?: string }> };

export default async function PortfolioPage({ searchParams }: Search) {
  const sp = await searchParams;
  const pageData = await getPage("portfolio");
  const c = pageData.content;
  const categories = ((c.categories as { name?: string }[]) ?? []).map((x) => x.name ?? "").filter(Boolean);
  const category = sp.category && categories.includes(sp.category) ? sp.category : undefined;
  const pageNum = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const [{ items: published, total }, demo] = await Promise.all([getPortfolio(category, pageNum), isDemoMode()]);
  // Development preview only: show client photos from the current site until real ones are published.
  const showingSamples = published.length === 0 && demo && !category;
  const items = showingSamples ? clientPhotoList() : published;
  const pages = Math.max(1, Math.ceil(total / PORTFOLIO_PAGE_SIZE));
  const href = (p: number, cat = category) => {
    const q = new URLSearchParams();
    if (cat) q.set("category", cat);
    if (p > 1) q.set("page", String(p));
    const qs = q.toString();
    return `/portfolio${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageIntro title={text(c.heading, "Portfolio")} intro={<Prose text={c.intro} />}>
        <p className="mt-6 text-sm">
          Looking for complete weddings? <Link href="/storytelling" className="underline underline-offset-4">Read our wedding stories</Link>.
        </p>
      </PageIntro>
      <section className="bg-ivory pb-24" aria-label="Photographs">
        <div className="container-x">
          {categories.length ? (
            <nav aria-label="Filter photographs" className="mb-10">
              <ul className="flex flex-wrap gap-2">
                {["", ...categories].map((cat) => {
                  const active = (category ?? "") === cat;
                  return (
                    <li key={cat || "all"}>
                      <Link
                        href={href(1, cat || undefined)}
                        aria-current={active ? "page" : undefined}
                        className={`inline-flex min-h-[40px] items-center border px-4 text-sm ${active ? "border-body bg-body text-ivory" : "border-stone hover:border-body"}`}
                      >
                        {cat || "All"}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ) : null}
          {showingSamples ? (
            <p className="mb-6 text-sm text-bronze">Preview: client photographs from the studio’s current website. Import them into the media library to publish them here.</p>
          ) : null}
          {items.length ? (
            <Gallery items={items} />
          ) : (
            <p className="max-w-prose py-10">{category ? "No photographs in this category yet." : "Photographs will appear here once they are published."}</p>
          )}
          {pages > 1 ? (
            <nav aria-label="Portfolio pages" className="mt-14 flex items-center justify-center gap-4">
              {pageNum > 1 ? <Link href={href(pageNum - 1)} className="btn btn-ghost-dark">Previous</Link> : null}
              <span className="text-sm">Page {pageNum} of {pages}</span>
              {pageNum < pages ? <Link href={href(pageNum + 1)} className="btn btn-ghost-dark">Next</Link> : null}
            </nav>
          ) : null}
        </div>
      </section>
    </>
  );
}
