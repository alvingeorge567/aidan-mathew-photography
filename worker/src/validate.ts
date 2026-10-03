import { stat } from "node:fs/promises";
import { fileTypeFromFile } from "file-type";
import sharp from "sharp";
import {
  DETECTED_IMAGE_MIMES, DETECTED_VIDEO_MIMES, DURATION_ERROR, MEDIA_RULES, formatBytes, isDurationAllowed, type MediaKind,
} from "../../shared/media-rules.ts";
import { ProbeError, probe, type ProbeInfo } from "./probe.ts";

export type Validated =
  | { ok: true; kind: MediaKind; mime: string; size: number; width: number; height: number; duration: number | null; probe?: ProbeInfo }
  | { ok: false; error: string; permanent: true };

const reject = (error: string): Validated => ({ ok: false, error, permanent: true });

/**
 * The trusted check. Filenames, extensions and browser MIME types are ignored: the real type
 * comes from the file's bytes, and video length comes from ffprobe.
 */
export async function validateFile(path: string, expected: MediaKind, ffprobe = "ffprobe"): Promise<Validated> {
  const { size } = await stat(path);
  if (size === 0) return reject("The uploaded file is empty.");

  const detected = await fileTypeFromFile(path);
  if (!detected) return reject("This file's type couldn't be recognised. Use JPEG, PNG, WebP, MP4, MOV or WebM.");
  const isVideo = DETECTED_VIDEO_MIMES.has(detected.mime);
  const isImage = DETECTED_IMAGE_MIMES.has(detected.mime);
  if (!isVideo && !isImage) return reject(`Unsupported file type (${detected.mime}). Use JPEG, PNG, WebP, MP4, MOV or WebM.`);
  const kind: MediaKind = isVideo ? "video" : "image";
  const a = (k: MediaKind) => (k === "image" ? "an image" : "a video");
  if (kind !== expected) return reject(`This file is ${a(kind)}, but it was uploaded as ${a(expected)}.`);

  const limit = kind === "video" ? MEDIA_RULES.maxVideoBytes : MEDIA_RULES.maxImageBytes;
  if (size > limit) return reject(`This file is ${formatBytes(size)}; the limit is ${formatBytes(limit)}.`);

  if (kind === "video") {
    let info: ProbeInfo;
    try {
      info = await probe(ffprobe, path);
    } catch (e) {
      if (e instanceof ProbeError) return reject(`The video couldn't be read (${e.message}). Export it again as MP4 (H.264) and retry.`);
      throw e;
    }
    if (!info.hasVideo) return reject("No video track was found in this file.");
    if (!isDurationAllowed(info.duration)) {
      const measured = Number.isFinite(info.duration) ? ` This clip is ${info.duration.toFixed(2)} seconds.` : "";
      return reject(`${DURATION_ERROR}${measured}`);
    }
    return { ok: true, kind, mime: detected.mime, size, width: info.width, height: info.height, duration: info.duration, probe: info };
  }

  let meta: sharp.Metadata;
  try {
    meta = await sharp(path, { failOn: "error" }).metadata();
  } catch {
    return reject("The image couldn't be read. It may be damaged; export it again and retry.");
  }
  const swap = (meta.orientation ?? 1) >= 5;
  const width = (swap ? meta.height : meta.width) ?? 0;
  const height = (swap ? meta.width : meta.height) ?? 0;
  const longEdge = Math.max(width, height);
  if (longEdge < MEDIA_RULES.minImageEdge) return reject(`This photo is ${width}×${height}px. Use at least ${MEDIA_RULES.minImageEdge}px on the long edge.`);
  if (longEdge > MEDIA_RULES.maxImageEdge) return reject(`This photo is ${width}×${height}px. The maximum is ${MEDIA_RULES.maxImageEdge}px on the long edge.`);
  return { ok: true, kind, mime: detected.mime, size, width, height, duration: null };
}
