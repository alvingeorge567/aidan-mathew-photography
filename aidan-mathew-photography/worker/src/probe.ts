import { spawn } from "node:child_process";

export type RunResult = { code: number; stdout: string; stderr: string };

/** Runs a binary with an argument array (no shell), with a hard timeout. */
export function run(cmd: string, args: string[], timeoutMs = 10 * 60 * 1000): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${cmd} timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => {
      if (stderr.length < 20000) stderr += d;
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Could not start ${cmd}: ${err.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

export type ProbeInfo = {
  duration: number;
  width: number;
  height: number;
  rotation: number;
  hasVideo: boolean;
  hasAudio: boolean;
  videoCodec: string | null;
  formatName: string;
};

type Stream = {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  duration?: string;
  disposition?: { attached_pic?: number };
  tags?: { rotate?: string };
  side_data_list?: { rotation?: number | string }[];
};

/** Pure parser for `ffprobe -show_format -show_streams -print_format json` output. */
export function parseProbe(json: { streams?: Stream[]; format?: { duration?: string; format_name?: string } }): ProbeInfo {
  const streams = json.streams ?? [];
  const video = streams.find((s) => s.codec_type === "video" && !s.disposition?.attached_pic);
  const audio = streams.find((s) => s.codec_type === "audio");
  const fromFormat = Number(json.format?.duration);
  const fromStream = Number(video?.duration);
  const duration = Number.isFinite(fromFormat) && fromFormat > 0 ? fromFormat : Number.isFinite(fromStream) ? fromStream : NaN;

  let rotation = 0;
  const side = video?.side_data_list?.find((d) => d.rotation !== undefined);
  if (side) rotation = Number(side.rotation) || 0;
  else if (video?.tags?.rotate) rotation = Number(video.tags.rotate) || 0;
  const quarterTurn = Math.abs(rotation) % 180 === 90;

  const w = video?.width ?? 0;
  const h = video?.height ?? 0;
  return {
    duration,
    width: quarterTurn ? h : w,
    height: quarterTurn ? w : h,
    rotation,
    hasVideo: Boolean(video && w > 0 && h > 0),
    hasAudio: Boolean(audio),
    videoCodec: video?.codec_name ?? null,
    formatName: json.format?.format_name ?? "",
  };
}

export async function probe(ffprobe: string, file: string): Promise<ProbeInfo> {
  const r = await run(ffprobe, ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file], 60_000);
  if (r.code !== 0) throw new ProbeError(r.stderr.trim().split("\n").pop() || "ffprobe could not read the file");
  return parseProbe(JSON.parse(r.stdout));
}

export class ProbeError extends Error {}
