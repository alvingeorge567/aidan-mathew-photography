import Link from "next/link";
import type { ResolvedMedia } from "@/lib/media";
import { formatDuration } from "@shared/media-rules";
import { MediaImage, Placeholder } from "./MediaImage";
import { PlayIcon } from "./icons";

type Props = {
  href: string | null;
  title: string;
  category: string;
  kindLabel?: string;
  poster?: ResolvedMedia | null;
  video?: ResolvedMedia | null;
  tone?: "light" | "dark";
};

export function FilmCard({ href, title, category, kindLabel, poster, video, tone = "light" }: Props) {
  const duration = formatDuration(video?.duration);
  const still = poster ?? video ?? null;
  const body = (
    <>
      <div className="relative aspect-video overflow-hidden bg-ink">
        {still ? (
          <MediaImage media={still} className="h-full w-full transition-transform duration-700 group-hover:scale-[1.03]" sizes="(min-width: 1024px) 33vw, 100vw" target={960} alt="" />
        ) : (
          <Placeholder className="h-full w-full" label="Film placeholder" />
        )}
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-ivory/70 bg-ink/30 text-ivory backdrop-blur-sm transition-colors group-hover:border-champagne group-hover:text-champagne">
            <PlayIcon className="ml-1 h-5 w-5" />
          </span>
        </span>
        {duration ? (
          <span className="absolute bottom-3 right-3 bg-ink/70 px-2 py-1 text-xs tabular-nums text-ivory">{duration}</span>
        ) : null}
      </div>
      <div className="pt-5">
        <h3 className={`font-serif text-2xl ${tone === "dark" ? "text-ivory" : "text-body"}`}>{title}</h3>
        <p className={`mt-1 text-sm ${tone === "dark" ? "text-ivory/65" : "text-bronze"}`}>
          {[category, kindLabel].filter(Boolean).join(" · ")}
          {duration ? <span className="sr-only">, {Math.round(video?.duration ?? 0)} seconds</span> : null}
        </p>
      </div>
    </>
  );
  return href ? (
    <Link href={href} className="group block">
      {body}
    </Link>
  ) : (
    <div className="group">{body}</div>
  );
}
