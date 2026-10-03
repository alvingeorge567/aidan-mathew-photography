"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ResolvedMedia } from "@/lib/media";
import { MediaImage } from "./MediaImage";
import { PauseIcon, PlayIcon } from "./icons";

type Props = {
  mode: "image" | "video";
  image?: ResolvedMedia | null;
  video?: ResolvedMedia | null;
  poster?: ResolvedMedia | null;
  focal: { x: number; y: number };
};

/**
 * Edge-to-edge hero. Video is muted, inline and decorative; it never carries essential content.
 * Autoplay is attempted, not assumed: if the browser refuses, the poster stays visible.
 * Visitors get a pause control, reduced-motion preferences are respected, and the video
 * pauses whenever it scrolls out of view.
 */
export function HeroMedia({ mode, image, video, poster, focal }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const userPaused = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [failed, setFailed] = useState(false);

  const still = poster ?? image ?? video ?? null;
  const useVideo = mode === "video" && video && video.videos.length > 0 && !failed;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const tryPlay = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.play().then(
      () => setPlaying(true),
      () => setPlaying(false), // Autoplay blocked (e.g. low-power mode). The poster remains.
    );
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v || !useVideo) return;
    if (reduced) {
      v.pause();
      setPlaying(false);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !userPaused.current) tryPlay();
        else if (!entry.isIntersecting) {
          v.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.2 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [reduced, tryPlay, useVideo]);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (playing) {
      userPaused.current = true;
      v.pause();
      setPlaying(false);
    } else {
      userPaused.current = false;
      tryPlay();
    }
  };

  const posterSrc = still?.images.find((i) => i.w >= 1280)?.url ?? still?.images.at(-1)?.url;
  const small = video?.videos[0];
  const large = video?.videos.at(-1);

  return (
    <div className="absolute inset-0">
      {useVideo && !reduced ? (
        <>
          <video
            ref={ref}
            className="h-full w-full object-cover"
            style={{ objectPosition: `${focal.x}% ${focal.y}%` }}
            muted
            loop
            playsInline
            preload="metadata"
            poster={posterSrc}
            aria-hidden="true"
            tabIndex={-1}
            onError={() => setFailed(true)}
          >
            {small && large && small !== large ? <source src={small.url} type="video/mp4" media="(max-width: 900px)" /> : null}
            {large ? <source src={large.url} type="video/mp4" /> : null}
          </video>
          <button
            type="button"
            onClick={toggle}
            className="absolute bottom-6 right-5 z-20 flex h-11 w-11 items-center justify-center border border-ivory/50 bg-ink/40 text-ivory backdrop-blur-sm hover:bg-ink/60 sm:right-8"
            aria-label={playing ? "Pause background video" : "Play background video"}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
        </>
      ) : (
        <MediaImage media={still} priority className="h-full w-full" focal={focal} sizes="100vw" target={1920} />
      )}
    </div>
  );
}
