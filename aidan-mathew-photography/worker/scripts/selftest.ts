/**
 * Offline check of the trusted validation and processing pipeline (no Supabase needed).
 * Generates synthetic clips with FFmpeg, then runs exactly the code the worker uses.
 *   npm run selftest
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { run } from "../src/probe.ts";
import { validateFile } from "../src/validate.ts";
import { buildImageDerivatives, buildVideoDerivatives } from "../src/derivatives.ts";
import { DURATION_ERROR } from "../../shared/media-rules.ts";

const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
const ffprobe = process.env.FFPROBE_PATH || "ffprobe";

async function clip(dir: string, name: string, seconds: number, size = "1920x1080", ext = "mp4") {
  const out = join(dir, `${name}.${ext}`);
  const vcodec = ext === "webm" ? ["-c:v", "libvpx-vp9", "-b:v", "1M", "-c:a", "libopus"] : ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac"];
  const r = await run(ffmpeg, [
    "-y", "-hide_banner", "-loglevel", "error",
    "-f", "lavfi", "-i", `testsrc2=size=${size}:rate=25:duration=${seconds}`,
    "-f", "lavfi", "-i", `sine=frequency=440:duration=${seconds}`,
    "-shortest", ...vcodec, out,
  ]);
  if (r.code !== 0) throw new Error(r.stderr);
  return out;
}

type Case = { label: string; file: string; kind: "video" | "image"; expectOk: boolean; expectError?: string };

async function main() {
  const dir = await mkdtemp(join(tmpdir(), "selftest-"));
  let failures = 0;
  try {
    const fake = join(dir, "not-really-a-video.mp4");
    await writeFile(fake, "This is a text file with a video extension.");
    const photo = join(dir, "photo.jpg");
    await sharp({ create: { width: 3000, height: 2000, channels: 3, background: { r: 180, g: 160, b: 140 } } }).jpeg().toFile(photo);
    const tiny = join(dir, "tiny.png");
    await sharp({ create: { width: 300, height: 200, channels: 3, background: "#888" } }).png().toFile(tiny);

    const cases: Case[] = [
      { label: "9 s video", file: await clip(dir, "v9", 9), kind: "video", expectOk: false, expectError: DURATION_ERROR },
      { label: "10 s video", file: await clip(dir, "v10", 10), kind: "video", expectOk: true },
      { label: "12 s video", file: await clip(dir, "v12", 12), kind: "video", expectOk: true },
      { label: "15 s video", file: await clip(dir, "v15", 15), kind: "video", expectOk: true },
      { label: "16 s video", file: await clip(dir, "v16", 16), kind: "video", expectOk: false, expectError: DURATION_ERROR },
      { label: "12 s portrait video", file: await clip(dir, "portrait", 12, "1080x1920"), kind: "video", expectOk: true },
      { label: "11 s MOV", file: await clip(dir, "mov11", 11, "1280x720", "mov"), kind: "video", expectOk: true },
      { label: "13 s WebM", file: await clip(dir, "webm13", 13, "1280x720", "webm"), kind: "video", expectOk: true },
      { label: "text file named .mp4", file: fake, kind: "video", expectOk: false },
      { label: "photo uploaded as video", file: photo, kind: "video", expectOk: false },
      { label: "3000×2000 JPEG", file: photo, kind: "image", expectOk: true },
      { label: "300×200 PNG (too small)", file: tiny, kind: "image", expectOk: false },
    ];

    for (const c of cases) {
      const v = await validateFile(c.file, c.kind, ffprobe);
      const pass = v.ok === c.expectOk && (!c.expectError || (!v.ok && v.error.startsWith(c.expectError)));
      if (!pass) failures++;
      const detail = v.ok ? `ok ${v.mime} ${v.width}×${v.height}${v.duration ? ` ${v.duration.toFixed(3)}s` : ""}` : `rejected: ${v.error}`;
      console.log(`${pass ? "PASS" : "FAIL"}  ${c.label.padEnd(26)} ${detail}`);
    }

    const portrait = await validateFile(join(dir, "portrait.mp4"), "video", ffprobe);
    if (portrait.ok) {
      const out = await mkdtemp(join(dir, "out-"));
      const built = await buildVideoDerivatives(join(dir, "portrait.mp4"), out, {
        ffmpeg, ffprobe, width: portrait.width, height: portrait.height, duration: portrait.duration ?? 12, hasAudio: true,
      });
      const ok = built.manifest.videos!.every((x) => x.h > x.w) && built.manifest.poster!.length > 0;
      if (!ok) failures++;
      console.log(`${ok ? "PASS" : "FAIL"}  portrait derivatives        ${built.manifest.videos!.map((x) => `${x.label}:${x.w}×${x.h}`).join(", ")}; ${built.manifest.poster!.length} poster sizes`);
    }
    const imgOut = await mkdtemp(join(dir, "img-"));
    const img = await buildImageDerivatives(photo, imgOut, 3000);
    const imgOk = img.manifest.images!.map((i) => i.w).join(",") === "480,960,1600,2400";
    if (!imgOk) failures++;
    console.log(`${imgOk ? "PASS" : "FAIL"}  image derivatives           ${img.manifest.images!.map((i) => `${i.w}×${i.h}`).join(", ")}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
}

main();
