"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "./icons";

export type CarouselReview = { id: string; name: string; text: string; rating: number | null; eventType: string };

/** Manually advanced — testimonials never rotate on their own. */
export function ReviewsCarousel({ reviews }: { reviews: CarouselReview[] }) {
  const [index, setIndex] = useState(0);
  if (!reviews.length) return null;
  const r = reviews[index];
  const go = (d: number) => setIndex((i) => (i + d + reviews.length) % reviews.length);

  return (
    <div className="mx-auto max-w-3xl text-center" role="group" aria-roledescription="carousel" aria-label="Client reviews">
      <div aria-live="polite" aria-atomic="true">
        <figure key={r.id}>
          {r.rating ? (
            <p className="mb-6 text-champagne" aria-label={`Rated ${r.rating} out of 5`}>
              {"★".repeat(r.rating)}
              <span className="text-ivory/25">{"★".repeat(5 - r.rating)}</span>
            </p>
          ) : null}
          <blockquote className="font-serif text-2xl italic leading-relaxed text-ivory sm:text-3xl">“{r.text}”</blockquote>
          <figcaption className="mt-8 text-sm tracking-wide text-ivory/80">
            {r.name}
            {r.eventType ? <span className="text-ivory/50"> — {r.eventType}</span> : null}
          </figcaption>
        </figure>
      </div>
      {reviews.length > 1 ? (
        <div className="mt-10 flex items-center justify-center gap-6 text-ivory">
          <button type="button" onClick={() => go(-1)} className="flex h-11 w-11 items-center justify-center border border-ivory/40 hover:border-champagne hover:text-champagne">
            <ChevronLeft />
            <span className="sr-only">Previous review</span>
          </button>
          <p className="min-w-[4rem] text-sm text-ivory/70">
            {index + 1} of {reviews.length}
          </p>
          <button type="button" onClick={() => go(1)} className="flex h-11 w-11 items-center justify-center border border-ivory/40 hover:border-champagne hover:text-champagne">
            <ChevronRight />
            <span className="sr-only">Next review</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
