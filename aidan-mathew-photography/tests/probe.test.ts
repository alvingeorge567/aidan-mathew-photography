import { describe, expect, it } from "vitest";
import { parseProbe } from "../worker/src/probe";

describe("ffprobe parsing", () => {
  it("reads duration and dimensions", () => {
    const info = parseProbe({ format: { duration: "12.040000", format_name: "mov,mp4" }, streams: [{ codec_type: "video", codec_name: "h264", width: 1920, height: 1080 }, { codec_type: "audio" }] });
    expect(info).toMatchObject({ duration: 12.04, width: 1920, height: 1080, hasVideo: true, hasAudio: true });
  });
  it("swaps dimensions for rotated phone footage", () => {
    const info = parseProbe({ format: { duration: "11" }, streams: [{ codec_type: "video", width: 1920, height: 1080, side_data_list: [{ rotation: -90 }] }] });
    expect([info.width, info.height]).toEqual([1080, 1920]);
  });
  it("ignores cover-art streams and flags missing video", () => {
    const info = parseProbe({ format: { duration: "12" }, streams: [{ codec_type: "video", width: 600, height: 600, disposition: { attached_pic: 1 } }] });
    expect(info.hasVideo).toBe(false);
  });
});
