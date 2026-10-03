import Link from "next/link";
import type { StoryBlock } from "@/lib/content/entities";
import type { MediaMap, ResolvedMedia } from "@/lib/media";
import { MediaImage } from "./MediaImage";
import { Prose, text } from "./Prose";
import { Gallery } from "./Gallery";
import { VideoPlayer } from "./VideoPlayer";

function str(v: unknown) {
  return typeof v === "string" ? v : "";
}

export function StoryBlocksView({ blocks, media }: { blocks: StoryBlock[]; media: MediaMap }) {
  return (
    <div className="space-y-16 sm:space-y-24">
      {blocks.map((b, i) => {
        const d = b.data ?? {};
        switch (b.type) {
          case "text":
            return (
              <section key={i} className="container-x">
                <div className="mx-auto max-w-prose">
                  {str(d.heading) ? <h2 className="mb-6 font-serif text-3xl sm:text-4xl">{str(d.heading)}</h2> : null}
                  <Prose text={d.body} className="font-serif text-xl leading-[1.7]" />
                </div>
              </section>
            );
          case "image_full": {
            const m = media[str(d.image_id)];
            if (!m) return null;
            return (
              <figure key={i}>
                <MediaImage media={m} sizes="100vw" target={2400} fit="contain" className="h-auto w-full" />
                {str(d.caption) ? <figcaption className="container-x mt-3 text-sm text-body/70">{str(d.caption)}</figcaption> : null}
              </figure>
            );
          }
          case "image_pair": {
            const pair = [media[str(d.left_id)], media[str(d.right_id)]].filter(Boolean) as ResolvedMedia[];
            if (!pair.length) return null;
            return (
              <figure key={i} className="container-x">
                <div className="grid gap-4 sm:grid-cols-2">
                  {pair.map((m) => (
                    <MediaImage key={m.id} media={m} sizes="(min-width: 640px) 50vw, 100vw" target={1600} fit="contain" className="h-auto w-full" />
                  ))}
                </div>
                {str(d.caption) ? <figcaption className="mt-3 text-sm text-body/70">{str(d.caption)}</figcaption> : null}
              </figure>
            );
          }
          case "gallery": {
            const items = (Array.isArray(d.images) ? d.images : [])
              .map((x) => media[str((x as { image_id?: unknown }).image_id)])
              .filter(Boolean) as ResolvedMedia[];
            if (!items.length) return null;
            return (
              <section key={i} className="container-x" aria-label="Photo gallery">
                <Gallery items={items} />
              </section>
            );
          }
          case "video": {
            const v = media[str(d.video_id)];
            if (!v || !v.videos.length) return null;
            return (
              <figure key={i} className="container-x">
                <VideoPlayer video={v} title={str(d.caption) || v.title || "Wedding film"} />
                {str(d.caption) ? <figcaption className="mt-3 text-center text-sm text-body/70">{str(d.caption)}</figcaption> : null}
              </figure>
            );
          }
          case "quote":
            if (d.permission_confirmed !== true || !str(d.text)) return null;
            return (
              <figure key={i} className="container-x">
                <blockquote className="mx-auto max-w-3xl text-center font-serif text-3xl italic leading-snug sm:text-4xl">“{str(d.text)}”</blockquote>
                {str(d.attribution) ? <figcaption className="mt-6 text-center text-sm text-bronze">{str(d.attribution)}</figcaption> : null}
              </figure>
            );
          case "cta":
            return (
              <section key={i} className="container-x">
                <div className="mx-auto max-w-2xl border-y border-stone py-12 text-center">
                  <h2 className="font-serif text-4xl">{text(d.heading, "Let’s Begin Your Story.")}</h2>
                  {str(d.text) ? <p className="mt-4">{str(d.text)}</p> : null}
                  <Link href="/booking" className="btn btn-dark mt-8">
                    {text(d.button_label, "Check Availability")}
                  </Link>
                </div>
              </section>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

export function blockMediaIds(blocks: StoryBlock[]): string[] {
  const ids: string[] = [];
  for (const b of blocks) {
    const d = b.data ?? {};
    for (const k of ["image_id", "left_id", "right_id", "video_id"]) if (typeof d[k] === "string" && d[k]) ids.push(d[k] as string);
    if (Array.isArray(d.images)) for (const x of d.images) if ((x as { image_id?: string }).image_id) ids.push((x as { image_id: string }).image_id);
  }
  return ids;
}
