import Link from "next/link";
import type { Values } from "@/lib/content/schema";
import type { MediaMap } from "@/lib/media";
import { parseExternalFilm } from "@shared/embeds";
import { formatDuration } from "@shared/media-rules";
import { VideoPlayer } from "@/components/site/VideoPlayer";
import { ExternalFilm } from "@/components/site/ExternalFilm";
import { Prose } from "@/components/site/Prose";

const s = (v: unknown) => (typeof v === "string" ? v : "");

export function FilmView({ content: c, media, story }: { content: Values; media: MediaMap; story?: { title: string; slug: string } | null }) {
  const video = media[s(c.video_id)];
  const poster = media[s(c.poster_id)];
  const embed = parseExternalFilm(s(c.external_url));
  return (
    <article className="bg-ink text-ivory">
      <div className="container-x pb-10 pt-32 sm:pt-36">
        <p className="text-sm text-champagne">
          <Link href="/films" className="underline-offset-4 hover:underline">Films</Link>
        </p>
        <h1 className="mt-3 font-serif text-4xl font-light sm:text-6xl">{s(c.title)}</h1>
        <p className="mt-3 text-sm text-ivory/70">
          {[s(c.category), s(c.kind_label), formatDuration(video?.duration)].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div className="px-0 sm:px-8">
        {video && video.videos.length ? (
          <VideoPlayer video={video} poster={poster} title={s(c.title)} />
        ) : (
          <p className="container-x py-20 text-ivory/70">This film isn't available right now.</p>
        )}
      </div>
      <div className="container-x grid gap-12 py-16 lg:grid-cols-[2fr_1fr]">
        <div>
          <Prose text={c.description} className="max-w-prose text-lg leading-relaxed text-ivory/85" />
          {s(c.captions_text) ? (
            <details className="mt-10 border-t border-ivory/15 pt-6">
              <summary className="cursor-pointer text-sm text-champagne">Captions and transcript</summary>
              <Prose text={c.captions_text} className="mt-4 text-sm text-ivory/80" />
            </details>
          ) : null}
        </div>
        <aside className="space-y-6 text-sm">
          {s(c.kind_label) ? <p className="text-ivory/70">This is a short {s(c.kind_label).toLowerCase()}, not the full wedding film.</p> : null}
          {story ? (
            <p>
              <Link href={`/stories/${story.slug}`} className="text-champagne underline underline-offset-4">Read the story: {story.title}</Link>
            </p>
          ) : null}
          <Link href="/booking" className="btn btn-gold">Check Availability</Link>
        </aside>
      </div>
      {embed ? (
        <div className="container-x pb-20 text-body">
          <div className="bg-ivory">
            <ExternalFilm embed={embed} title={s(c.title)} />
          </div>
        </div>
      ) : null}
    </article>
  );
}
