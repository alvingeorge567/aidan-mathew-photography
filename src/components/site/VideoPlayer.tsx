import type { ResolvedMedia } from "@/lib/media";

/**
 * Film playback: native controls (keyboard, fullscreen, volume), no autoplay. Sound plays only
 * after the visitor presses play. Portrait and landscape footage keep their aspect ratio.
 */
export function VideoPlayer({ video, poster, title }: { video: ResolvedMedia; poster?: ResolvedMedia | null; title: string }) {
  const still = poster ?? video;
  const posterUrl = still.images.find((i) => i.w >= 1280)?.url ?? still.images.at(-1)?.url;
  const portrait = video.height > video.width;
  return (
    <div className={`mx-auto bg-ink ${portrait ? "max-w-md" : "max-w-6xl"}`}>
      <video
        className="block max-h-[80svh] w-full bg-ink object-contain"
        style={{ aspectRatio: `${video.width} / ${video.height}` }}
        controls
        playsInline
        preload="metadata"
        poster={posterUrl}
        aria-label={title}
      >
        {[...video.videos].reverse().map((v) => (
          <source key={v.url} src={v.url} type="video/mp4" />
        ))}
        Your browser can’t play this video.
      </video>
    </div>
  );
}
