import Link from "next/link";
import type { Values } from "@/lib/content/schema";
import type { MediaMap } from "@/lib/media";
import { MediaImage } from "@/components/site/MediaImage";
import { Prose, text } from "@/components/site/Prose";
import { VideoPlayer } from "@/components/site/VideoPlayer";

const s = (v: unknown) => (typeof v === "string" ? v : "");

export type StoryCard = { slug: string; title: string; couple: string; category: string; coverId: string };

export function StorytellingView({
  content: c, media, stories, categories, activeCategory,
}: { content: Values; media: MediaMap; stories: StoryCard[]; categories: string[]; activeCategory?: string }) {
  const passages = (Array.isArray(c.passages) ? c.passages : []) as Values[];
  const hero = media[s(c.hero_image_id)];
  return (
    <>
      <header className="bg-ivory pb-16 pt-36 sm:pt-44">
        <div className="container-x">
          <h1 className="max-w-4xl font-serif text-5xl font-light leading-[1.05] sm:text-6xl lg:text-7xl">{text(c.heading, "Your Wedding Is More Than a Day. It Is a Story.")}</h1>
          <Prose text={c.intro} className="mt-10 max-w-prose font-serif text-xl leading-[1.75]" />
        </div>
      </header>
      {hero ? <MediaImage media={hero} priority sizes="100vw" target={2400} className="h-[60svh] w-full" /> : null}

      {passages.length ? (
        <section className="bg-ivory py-20 sm:py-28" aria-label="Our approach">
          <div className="container-x space-y-20 sm:space-y-28">
            {passages.map((p, i) => {
              const img = media[s(p.image_id)];
              const vid = media[s(p.video_id)];
              const hasMedia = img || vid;
              return (
                <article key={i} className={`grid items-center gap-10 ${hasMedia ? "lg:grid-cols-2 lg:gap-20" : ""}`}>
                  <div className={hasMedia && i % 2 === 1 ? "lg:order-2" : ""}>
                    {s(p.heading) ? <h2 className="font-serif text-4xl font-light">{s(p.heading)}</h2> : null}
                    <Prose text={p.text} className="mt-6 max-w-prose leading-relaxed" />
                  </div>
                  {vid && vid.videos.length ? (
                    <VideoPlayer video={vid} title={s(p.heading) || "Short film"} />
                  ) : img ? (
                    <div className="aspect-[4/5] overflow-hidden">
                      <MediaImage media={img} sizes="(min-width: 1024px) 45vw, 100vw" className="h-full w-full" />
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="border-t border-stone bg-ivory py-20 sm:py-28" aria-labelledby="stories-title">
        <div className="container-x">
          <h2 id="stories-title" className="font-serif text-4xl font-light sm:text-5xl">{text(c.stories_heading, "Wedding Stories")}</h2>
          {categories.length ? (
            <nav aria-label="Filter stories" className="mt-8">
              <ul className="flex flex-wrap gap-2">
                {["", ...categories].map((cat) => {
                  const active = (activeCategory ?? "") === cat;
                  return (
                    <li key={cat || "all"}>
                      <Link
                        href={cat ? `/storytelling?category=${encodeURIComponent(cat)}` : "/storytelling"}
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
          {stories.length ? (
            <ul className="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {stories.map((st) => (
                <li key={st.slug}>
                  <Link href={`/stories/${st.slug}`} className="group block">
                    <div className="aspect-[4/5] overflow-hidden">
                      <MediaImage media={media[st.coverId]} alt="" sizes="(min-width: 1024px) 33vw, 50vw" className="h-full w-full transition-transform duration-700 group-hover:scale-[1.03]" />
                    </div>
                    <h3 className="mt-5 font-serif text-2xl">{st.title}</h3>
                    <p className="mt-1 text-sm text-bronze">{[st.couple, st.category].filter(Boolean).join(" · ")}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-10 max-w-prose">
              {activeCategory ? "No stories in this category yet." : "Wedding stories will appear here once they are published."}{" "}
              <Link href="/portfolio" className="underline underline-offset-4">Browse the portfolio</Link>.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
