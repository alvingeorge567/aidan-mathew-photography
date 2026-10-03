/**
 * Full-length films may be linked from an approved provider. We never accept embed HTML:
 * the URL is parsed, the video ID extracted and validated, and the embed URL rebuilt.
 */
export type EmbedProvider = "youtube" | "vimeo";
export type EmbedInfo = { provider: EmbedProvider; id: string; embedUrl: string; watchUrl: string; label: string };

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

export function parseExternalFilm(raw: string | null | undefined): EmbedInfo | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0] || null;
    else if (url.pathname === "/watch") id = url.searchParams.get("v");
    else id = /^\/(?:embed|shorts|live)\/([^/?#]+)/.exec(url.pathname)?.[1] ?? null;
    if (!id || !YT_ID.test(id)) return null;
    return {
      provider: "youtube",
      id,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`,
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
      label: "YouTube",
    };
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    const idIndex = parts.findIndex((p) => /^\d{5,12}$/.test(p));
    if (idIndex === -1) return null;
    const id = parts[idIndex];
    const hashCandidate = url.searchParams.get("h") ?? parts[idIndex + 1];
    const hash = hashCandidate && /^[a-f0-9]{6,20}$/i.test(hashCandidate) ? hashCandidate : null;
    return {
      provider: "vimeo",
      id,
      embedUrl: `https://player.vimeo.com/video/${id}?dnt=1${hash ? `&h=${hash}` : ""}`,
      watchUrl: `https://vimeo.com/${id}${hash ? `/${hash}` : ""}`,
      label: "Vimeo",
    };
  }
  return null;
}
