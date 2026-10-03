import Link from "next/link";
import type { Values } from "@/lib/content/schema";
import type { StoryBlock } from "@/lib/content/entities";
import type { MediaMap } from "@/lib/media";
import { MediaImage } from "@/components/site/MediaImage";
import { Prose, text } from "@/components/site/Prose";
import { StoryBlocksView } from "@/components/site/StoryBlocksView";

const s = (v: unknown) => (typeof v === "string" ? v : "");

function formatDate(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

export function StoryView({ content: c, blocks, media }: { content: Values; blocks: StoryBlock[]; media: MediaMap }) {
  const meta = [
    s(c.couple_names),
    c.show_date === true && s(c.event_date) ? formatDate(s(c.event_date)) : "",
    c.show_location === true ? s(c.location) : "",
  ].filter(Boolean);
  return (
    <article>
      <header className="relative isolate flex min-h-[85svh] items-end bg-ink text-ivory">
        <div className="absolute inset-0 -z-10">
          <MediaImage media={media[s(c.cover_id)]} priority sizes="100vw" target={2400} className="h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-ink/20" aria-hidden="true" />
        </div>
        <div className="container-x pb-16 pt-40">
          <p className="text-sm text-champagne">
            <Link href="/storytelling" className="underline-offset-4 hover:underline">Wedding Stories</Link>
          </p>
          <h1 className="mt-4 max-w-4xl font-serif text-5xl font-light leading-[1.05] sm:text-7xl">{s(c.title)}</h1>
          {meta.length ? <p className="mt-6 text-ivory/80">{meta.join(" · ")}</p> : null}
        </div>
      </header>
      {s(c.intro) ? (
        <div className="container-x py-20">
          <Prose text={c.intro} className="mx-auto max-w-prose font-serif text-2xl leading-[1.6]" />
        </div>
      ) : (
        <div className="py-10" />
      )}
      <div className="pb-24">
        <StoryBlocksView blocks={blocks} media={media} />
      </div>
      <section className="bg-ink py-24 text-center text-ivory">
        <div className="container-x">
          <h2 className="font-serif text-4xl font-light sm:text-5xl">{text(c.closing_heading, "Let’s Begin Your Story.")}</h2>
          {s(c.closing_text) ? <p className="mx-auto mt-5 max-w-xl text-ivory/80">{s(c.closing_text)}</p> : null}
          <Link href="/booking" className="btn btn-gold mt-10">Check Availability</Link>
        </div>
      </section>
    </article>
  );
}
