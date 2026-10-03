/**
 * Media rules shared by the browser, the Next.js server and the processing worker.
 * The worker's check is the trusted one; browser checks only give fast feedback.
 *
 * Every limit is read from the same NEXT_PUBLIC_* variables in all three places so
 * the interface, server and worker stay consistent. Keep the Supabase bucket
 * file_size_limit (see supabase/migrations/0004_storage.sql) in line with these.
 */
export const MB = 1024 * 1024;

function readNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export const MEDIA_RULES = {
  videoMinSeconds: 10,
  videoMaxSeconds: 15,
  /** Container timestamps can differ from the edit length by a few milliseconds. */
  durationToleranceSeconds: readNumber(process.env.NEXT_PUBLIC_VIDEO_DURATION_TOLERANCE_S, 0.05),
  maxVideoBytes: readNumber(process.env.NEXT_PUBLIC_MAX_VIDEO_MB, 200) * MB,
  maxImageBytes: readNumber(process.env.NEXT_PUBLIC_MAX_IMAGE_MB, 40) * MB,
  minImageEdge: readNumber(process.env.NEXT_PUBLIC_MIN_IMAGE_EDGE_PX, 600),
  maxImageEdge: readNumber(process.env.NEXT_PUBLIC_MAX_IMAGE_EDGE_PX, 12000),
} as const;

export const VIDEO_TYPES = { mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm" } as const;
export const IMAGE_TYPES = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;

/** MIME types accepted after magic-byte detection in the worker. */
export const DETECTED_VIDEO_MIMES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
export const DETECTED_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const DURATION_ERROR = "Please upload a video between 10 and 15 seconds long.";

export type MediaKind = "image" | "video";

export function extensionOf(filename: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(filename.trim());
  return match ? match[1].toLowerCase() : "";
}

/**
 * First-pass classification from filename and browser MIME type.
 * Not trusted: the worker re-detects the real type from the file contents.
 */
export function classifyUpload(
  filename: string,
  browserMime: string,
): { kind: MediaKind; ext: string; contentType: string } | null {
  const ext = extensionOf(filename);
  const mime = (browserMime || "").toLowerCase();
  if (ext in VIDEO_TYPES) {
    if (mime && !mime.startsWith("video/")) return null;
    return { kind: "video", ext, contentType: VIDEO_TYPES[ext as keyof typeof VIDEO_TYPES] };
  }
  if (ext in IMAGE_TYPES) {
    if (mime && !mime.startsWith("image/")) return null;
    return { kind: "image", ext: ext === "jpeg" ? "jpg" : ext, contentType: IMAGE_TYPES[ext as keyof typeof IMAGE_TYPES] };
  }
  return null;
}

export function sizeLimitFor(kind: MediaKind): number {
  return kind === "video" ? MEDIA_RULES.maxVideoBytes : MEDIA_RULES.maxImageBytes;
}

export function formatBytes(bytes: number): string {
  if (bytes >= MB) return `${Math.round((bytes / MB) * 10) / 10} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** 10–15 seconds inclusive, with a small tolerance for container rounding. */
export function isDurationAllowed(seconds: number, tolerance: number = MEDIA_RULES.durationToleranceSeconds): boolean {
  if (!Number.isFinite(seconds) || seconds <= 0) return false;
  return seconds >= MEDIA_RULES.videoMinSeconds - tolerance && seconds <= MEDIA_RULES.videoMaxSeconds + tolerance;
}

/** Returns a user-facing error, or null when the file passes the first-pass checks. */
export function precheckFile(filename: string, browserMime: string, size: number): string | null {
  const c = classifyUpload(filename, browserMime);
  if (!c) return "Unsupported file type. Use JPEG, PNG or WebP photos, or MP4, MOV or WebM videos.";
  const limit = sizeLimitFor(c.kind);
  if (size <= 0) return "This file is empty.";
  if (size > limit) return `This file is ${formatBytes(size)}. The limit for ${c.kind === "video" ? "videos" : "photos"} is ${formatBytes(limit)}.`;
  return null;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || !Number.isFinite(seconds)) return "";
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
