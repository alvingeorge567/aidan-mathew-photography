"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pickImage, srcSetOf, type ResolvedMedia } from "@/lib/media";
import { MediaImage } from "./MediaImage";
import { ChevronLeft, ChevronRight, CloseIcon } from "./icons";

type Props = { items: ResolvedMedia[]; layout?: "masonry" | "grid"; sizes?: string };

/**
 * Masonry grid of optimized previews. Thumbnails keep their natural shape (no cropping);
 * the lightbox loads a larger rendition only when opened.
 */
export function Gallery({ items, layout = "masonry", sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" }: Props) {
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const touchX = useRef<number | null>(null);

  const open = (i: number, el: HTMLButtonElement) => {
    triggerRef.current = el;
    setIndex(i);
  };
  const close = useCallback(() => setIndex(null), []);
  const step = useCallback((d: number) => setIndex((i) => (i === null ? i : (i + d + items.length) % items.length)), [items.length]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (index !== null && !dlg.open) dlg.showModal();
    if (index === null && dlg.open) {
      dlg.close();
      triggerRef.current?.focus();
    }
  }, [index]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, step]);

  const current = index !== null ? items[index] : null;
  const large = current ? pickImage(current, 2400) : null;

  return (
    <>
      <ul className={layout === "masonry" ? "columns-1 gap-4 sm:columns-2 lg:columns-3 [&>li]:mb-4" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
        {items.map((m, i) => (
          <li key={m.id} className="break-inside-avoid">
            <button
              type="button"
              onClick={(e) => open(i, e.currentTarget)}
              className="group block w-full overflow-hidden text-left"
              aria-label={`Open photograph ${i + 1} of ${items.length}${m.alt ? `: ${m.alt}` : ""}`}
            >
              <MediaImage media={m} sizes={sizes} target={960} fit="contain" className={`h-auto w-full transition-opacity duration-300 group-hover:opacity-90 ${layout === "grid" ? "aspect-[4/5] !object-cover" : ""}`} />
            </button>
            {m.caption ? <p className="mt-2 text-sm text-body/75">{m.caption}</p> : null}
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        onClose={close}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        aria-label="Photograph viewer"
        className="m-0 h-[100dvh] max-h-none w-screen max-w-none bg-ink p-0 text-ivory backdrop:bg-ink"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        {current && large ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between px-4 py-3 sm:px-6">
              <p className="text-sm text-ivory/70" aria-live="polite">
                {(index ?? 0) + 1} / {items.length}
              </p>
              <button type="button" onClick={close} className="flex h-11 w-11 items-center justify-center" autoFocus>
                <CloseIcon />
                <span className="sr-only">Close viewer</span>
              </button>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={large.url} srcSet={srcSetOf(current)} sizes="100vw" alt={current.alt} className="max-h-full max-w-full object-contain" />
              {items.length > 1 ? (
                <>
                  <button type="button" onClick={() => step(-1)} className="absolute left-1 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center bg-ink/40 sm:left-3">
                    <ChevronLeft className="h-7 w-7" />
                    <span className="sr-only">Previous photograph</span>
                  </button>
                  <button type="button" onClick={() => step(1)} className="absolute right-1 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center bg-ink/40 sm:right-3">
                    <ChevronRight className="h-7 w-7" />
                    <span className="sr-only">Next photograph</span>
                  </button>
                </>
              ) : null}
            </div>
            <p className="min-h-[3.5rem] px-6 py-4 text-center text-sm text-ivory/80">{current.caption}</p>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
