/** Media types shared by public pages, previews and the admin. */
export type DerivativeFile = { file: string; w: number; h: number };
export type DerivativeManifest = {
  images?: DerivativeFile[];
  videos?: (DerivativeFile & { label: string })[];
  poster?: DerivativeFile[];
  blur?: string;
};

export type MediaSource = { url: string; w: number; h: number };

export type ResolvedMedia = {
  id: string;
  type: "image" | "video";
  title: string;
  alt: string;
  caption: string;
  category: string;
  width: number;
  height: number;
  duration: number | null;
  focalX: number;
  focalY: number;
  /** For photos: the photo. For videos: poster frames. Ascending width. */
  images: MediaSource[];
  /** Video renditions, smallest first. */
  videos: (MediaSource & { label: string })[];
  blur?: string;
};

export type MediaMap = Record<string, ResolvedMedia>;

type MediaRow = {
  id: string;
  media_type: "image" | "video";
  title: string | null;
  alt_text: string | null;
  caption: string | null;
  category: string | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | string | null;
  focal_x: number | null;
  focal_y: number | null;
};

export function resolveMedia(row: MediaRow, manifest: DerivativeManifest | null, urlFor: (file: string) => string): ResolvedMedia {
  const m = manifest ?? {};
  const imgs = (row.media_type === "image" ? m.images : m.poster) ?? [];
  return {
    id: row.id,
    type: row.media_type,
    title: row.title ?? "",
    alt: row.alt_text ?? "",
    caption: row.caption ?? "",
    category: row.category ?? "",
    width: row.width ?? imgs.at(-1)?.w ?? 1600,
    height: row.height ?? imgs.at(-1)?.h ?? 1067,
    duration: row.duration_seconds == null ? null : Number(row.duration_seconds),
    focalX: row.focal_x ?? 50,
    focalY: row.focal_y ?? 50,
    images: [...imgs].sort((a, b) => a.w - b.w).map((d) => ({ url: urlFor(d.file), w: d.w, h: d.h })),
    videos: [...(m.videos ?? [])].sort((a, b) => a.w * a.h - b.w * b.h).map((d) => ({ url: urlFor(d.file), w: d.w, h: d.h, label: d.label })),
    blur: m.blur,
  };
}

export function publicMediaUrl(prefix: string, file: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media-public/${prefix}/${file}`;
}

export function srcSetOf(m: ResolvedMedia): string {
  return m.images.map((i) => `${i.url} ${i.w}w`).join(", ");
}

/** A sensible default `src`: the first rendition at least `target` px wide. */
export function pickImage(m: ResolvedMedia, target = 1600): MediaSource | null {
  if (!m.images.length) return null;
  return m.images.find((i) => i.w >= target) ?? m.images[m.images.length - 1];
}
