import type { Metadata } from "next";
import Link from "next/link";
import { getFilms, getMedia, getPage, getSettings } from "@/lib/data/public";
import { pageMetadata } from "@/lib/seo";
import { PageIntro } from "@/components/site/PageIntro";
import { Prose, text } from "@/components/site/Prose";
import { FilmCard } from "@/components/site/FilmCard";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const [settings, page] = await Promise.all([getSettings(), getPage("films")]);
  return pageMetadata({ settings, content: page.content, path: "/films", fallbackTitle: "Films" });
}

export default async function FilmsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const sp = await searchParams;
  const page = await getPage("films");
  const c = page.content;
  const categories = ((c.categories as { name?: string }[]) ?? []).map((x) => x.name ?? "").filter(Boolean);
  const category = sp.category && categories.includes(sp.category) ? sp.category : undefined;
  const films = await getFilms({ category });
  const media = await getMedia(films.flatMap((f) => [String(f.content.poster_id ?? ""), String(f.content.video_id ?? "")]));

  return (
    <div className="bg-ink text-ivory">
      <PageIntro tone="dark" title={text(c.heading, "Films")} intro={<Prose text={c.intro} />} />
      <section className="pb-24" aria-label="Film library">
        <div className="container-x">
          {categories.length ? (
            <nav aria-label="Filter films" className="mb-12">
              <ul className="flex flex-wrap gap-2">
                {["", ...categories].map((cat) => {
                  const active = (category ?? "") === cat;
                  return (
                    <li key={cat || "all"}>
                      <Link
                        href={cat ? `/films?category=${encodeURIComponent(cat)}` : "/films"}
                        aria-current={active ? "page" : undefined}
                        className={`inline-flex min-h-[40px] items-center border px-4 text-sm ${active ? "border-champagne bg-champagne text-ink" : "border-ivory/25 hover:border-ivory"}`}
                      >
                        {cat || "All"}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ) : null}
          {films.length ? (
            <ul className="grid gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
              {films.map((f) => (
                <li key={f.id}>
                  <FilmCard
                    tone="dark"
                    href={`/films/${String(f.content.slug)}`}
                    title={String(f.content.title ?? "")}
                    category={String(f.content.category ?? "")}
                    kindLabel={String(f.content.kind_label ?? "")}
                    poster={media[String(f.content.poster_id ?? "")]}
                    video={media[String(f.content.video_id ?? "")]}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="max-w-prose text-ivory/75">{category ? "No films in this category yet." : "Films will appear here once they are published."}</p>
          )}
        </div>
      </section>
    </div>
  );
}
