import { join } from "node:path";
import sharp from "sharp";
import { probe, run } from "./probe.ts";

export type DerivFile = { file: string; w: number; h: number };
export type Manifest = { images?: DerivFile[]; videos?: (DerivFile & { label: string })[]; poster?: DerivFile[]; blur?: string };
export type Built = { manifest: Manifest; files: { name: string; contentType: string }[]; mainFile: string; posterFile: string | null };

const IMAGE_WIDTHS = [480, 960, 1600, 2400];
const POSTER_WIDTHS = [640, 1280, 1920];

function targetWidths(original: number, widths: number[]): number[] {
  const list = widths.filter((w) => w < original);
  list.push(Math.min(original, widths[widths.length - 1]));
  return [...new Set(list)].sort((a, b) => a - b);
}

async function blurPlaceholder(input: string | Buffer): Promise<string> {
  const buf = await sharp(input).rotate().resize(24, 24, { fit: "inside" }).webp({ quality: 40 }).toBuffer();
  return `data:image/webp;base64,${buf.toString("base64")}`;
}

/** Optimized WebP renditions. Metadata (including GPS) is stripped; the original is never modified. */
export async function buildImageDerivatives(input: string, outDir: string, width: number): Promise<Built> {
  const images: DerivFile[] = [];
  for (const w of targetWidths(width, IMAGE_WIDTHS)) {
    const name = `image-${w}.webp`;
    const info = await sharp(input).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }).toFile(join(outDir, name));
    images.push({ file: name, w: info.width, h: info.height });
  }
  const largest = images[images.length - 1];
  return {
    manifest: { images, blur: await blurPlaceholder(input) },
    files: images.map((i) => ({ name: i.file, contentType: "image/webp" })),
    mainFile: largest.file,
    posterFile: null,
  };
}

/** Browser-compatible H.264/AAC MP4 renditions (portrait and landscape keep their shape) plus poster frames. */
export async function buildVideoDerivatives(
  input: string,
  outDir: string,
  opts: { ffmpeg: string; ffprobe: string; width: number; height: number; duration: number; hasAudio: boolean },
): Promise<Built> {
  const longEdge = Math.max(opts.width, opts.height);
  const renditions = [{ label: "720", max: 1280 }];
  if (longEdge > 1280) renditions.push({ label: "1080", max: 1920 });

  const videos: (DerivFile & { label: string })[] = [];
  for (const r of renditions) {
    const name = `video-${r.label}.mp4`;
    const out = join(outDir, name);
    const scale = `scale='if(gt(iw,ih),trunc(min(${r.max},iw)/2)*2,-2)':'if(gt(iw,ih),-2,trunc(min(${r.max},ih)/2)*2)'`;
    const args = [
      "-y", "-hide_banner", "-loglevel", "error", "-i", input,
      "-map", "0:v:0", ...(opts.hasAudio ? ["-map", "0:a:0"] : []),
      "-vf", scale, "-c:v", "libx264", "-preset", "medium", "-crf", "22", "-pix_fmt", "yuv420p", "-profile:v", "high",
      "-movflags", "+faststart", "-t", "16",
      ...(opts.hasAudio ? ["-c:a", "aac", "-b:a", "128k", "-ac", "2"] : ["-an"]),
      out,
    ];
    const res = await run(opts.ffmpeg, args);
    if (res.code !== 0) throw new Error(`FFmpeg could not convert the video: ${res.stderr.trim().split("\n").pop()}`);
    const p = await probe(opts.ffprobe, out);
    videos.push({ file: name, w: p.width, h: p.height, label: r.label });
  }

  const frameAt = Math.min(1, Math.max(0, opts.duration / 2)).toFixed(2);
  const posterJpg = join(outDir, "poster-source.jpg");
  const grab = await run(opts.ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", "-ss", frameAt, "-i", input, "-frames:v", "1", "-q:v", "2", posterJpg]);
  if (grab.code !== 0) throw new Error(`FFmpeg could not create a poster frame: ${grab.stderr.trim().split("\n").pop()}`);

  const meta = await sharp(posterJpg).metadata();
  const poster: DerivFile[] = [];
  for (const w of targetWidths(meta.width ?? 1280, POSTER_WIDTHS)) {
    const name = `poster-${w}.webp`;
    const info = await sharp(posterJpg).resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }).toFile(join(outDir, name));
    poster.push({ file: name, w: info.width, h: info.height });
  }

  videos.sort((a, b) => a.w * a.h - b.w * b.h);
  return {
    manifest: { videos, poster, blur: await blurPlaceholder(posterJpg) },
    files: [...videos.map((v) => ({ name: v.file, contentType: "video/mp4" })), ...poster.map((p) => ({ name: p.file, contentType: "image/webp" }))],
    mainFile: videos[videos.length - 1].file,
    posterFile: poster[poster.length - 1].file,
  };
}
