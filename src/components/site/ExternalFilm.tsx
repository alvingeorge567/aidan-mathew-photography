"use client";

import { useState } from "react";
import type { EmbedInfo } from "@shared/embeds";

/** Loads a third-party player only when the visitor asks for it. */
export function ExternalFilm({ embed, title }: { embed: EmbedInfo; title: string }) {
  const [show, setShow] = useState(false);
  if (!show) {
    return (
      <div className="flex flex-col items-start gap-3 border border-stone p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">The full-length film is hosted on {embed.label}. Loading it shares your visit with {embed.label}.</p>
        <div className="flex gap-3">
          <button type="button" onClick={() => setShow(true)} className="btn btn-dark">
            Watch the full film
          </button>
          <a href={embed.watchUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost-dark">
            Open on {embed.label}
          </a>
        </div>
      </div>
    );
  }
  return (
    <div className="aspect-video w-full bg-ink">
      <iframe
        src={embed.embedUrl}
        title={`${title} — full film on ${embed.label}`}
        className="h-full w-full"
        allow="fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
      />
    </div>
  );
}
