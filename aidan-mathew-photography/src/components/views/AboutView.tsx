import type { Values } from "@/lib/content/schema";
import type { MediaMap } from "@/lib/media";
import { MediaImage } from "@/components/site/MediaImage";
import { Prose, text } from "@/components/site/Prose";
import { VideoPlayer } from "@/components/site/VideoPlayer";
import Link from "next/link";

const s = (v: unknown) => (typeof v === "string" ? v : "");

export function AboutView({ content: c, media }: { content: Values; media: MediaMap }) {
  const team = (Array.isArray(c.team) ? c.team : []) as Values[];
  const bts = (Array.isArray(c.bts) ? c.bts : []) as Values[];
  const video = media[s(c.intro_video_id)];
  return (
    <>
      <section className="bg-ivory pb-20 pt-36 sm:pt-44">
        <div className="container-x grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
          <div className="aspect-[4/5] overflow-hidden lg:sticky lg:top-28 lg:self-start">
            <MediaImage media={media[s(c.founder_image_id)]} priority sizes="(min-width: 1024px) 45vw, 100vw" className="h-full w-full" placeholderLabel="Founder portrait" />
          </div>
          <div>
            <h1 className="font-serif text-5xl font-light leading-[1.05] sm:text-6xl">{text(c.heading, "The Story Behind the Lens")}</h1>
            <span className="mt-8 block h-px w-16 bg-champagne" aria-hidden="true" />
            <Prose text={c.intro} className="mt-10 max-w-prose font-serif text-xl leading-[1.75]" />
            {s(c.philosophy_text) ? (
              <div className="mt-16">
                <h2 className="font-serif text-3xl">{text(c.philosophy_heading, "How We Work")}</h2>
                <Prose text={c.philosophy_text} className="mt-6 max-w-prose leading-relaxed" />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {video ? (
        <section id="introduction-video" className="bg-ink py-20 text-ivory" aria-label="Introduction video">
          <div className="container-x">
            <VideoPlayer video={video} title="Introduction from the studio" />
          </div>
        </section>
      ) : null}

      {team.length ? (
        <section className="border-t border-stone bg-ivory py-24" aria-labelledby="team-title">
          <div className="container-x">
            <h2 id="team-title" className="font-serif text-4xl font-light">The Team</h2>
            <ul className="mt-12 grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
              {team.map((p, i) => (
                <li key={i}>
                  <div className="aspect-[4/5] overflow-hidden">
                    <MediaImage media={media[s(p.image_id)]} sizes="(min-width: 1024px) 30vw, 50vw" className="h-full w-full" />
                  </div>
                  <h3 className="mt-5 font-serif text-2xl">{s(p.name)}</h3>
                  {s(p.role) ? <p className="text-sm text-bronze">{s(p.role)}</p> : null}
                  {s(p.bio) ? <p className="mt-3 text-sm leading-relaxed">{s(p.bio)}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {bts.length ? (
        <section className="bg-ivory pb-24" aria-labelledby="bts-title">
          <div className="container-x">
            <h2 id="bts-title" className="font-serif text-4xl font-light">Behind the Scenes</h2>
            <ul className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {bts.map((b, i) => (
                <li key={i}>
                  <figure>
                    <div className="aspect-square overflow-hidden">
                      <MediaImage media={media[s(b.image_id)]} sizes="(min-width: 1024px) 25vw, 50vw" className="h-full w-full" />
                    </div>
                    {s(b.caption) ? <figcaption className="mt-2 text-xs text-body/70">{s(b.caption)}</figcaption> : null}
                  </figure>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="bg-ink py-20 text-center text-ivory">
        <div className="container-x">
          <h2 className="font-serif text-4xl font-light">Let’s Begin Your Story.</h2>
          <Link href="/booking" className="btn btn-gold mt-8">Check Availability</Link>
        </div>
      </section>
    </>
  );
}
