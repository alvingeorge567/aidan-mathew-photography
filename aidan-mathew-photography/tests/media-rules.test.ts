import { describe, expect, it } from "vitest";
import { DURATION_ERROR, classifyUpload, formatDuration, isDurationAllowed, precheckFile } from "@shared/media-rules";

describe("video duration rule (10–15 s inclusive)", () => {
  it.each([10, 12, 15, 10.02, 14.99])("accepts %s s", (s) => expect(isDurationAllowed(s)).toBe(true));
  it.each([0, 5, 9, 9.9, 15.2, 16, 30, NaN, Infinity])("rejects %s s", (s) => expect(isDurationAllowed(s)).toBe(false));
  it("uses the exact message from the brief", () => expect(DURATION_ERROR).toBe("Please upload a video between 10 and 15 seconds long."));
});

describe("first-pass file checks", () => {
  it("classifies by extension and normalizes jpeg", () => {
    expect(classifyUpload("Ceremony.JPEG", "image/jpeg")).toEqual({ kind: "image", ext: "jpg", contentType: "image/jpeg" });
    expect(classifyUpload("clip.mov", "")).toEqual({ kind: "video", ext: "mov", contentType: "video/quicktime" });
  });
  it("rejects unsupported or mismatched types", () => {
    expect(classifyUpload("doc.pdf", "application/pdf")).toBeNull();
    expect(classifyUpload("fake.mp4", "image/png")).toBeNull();
    expect(precheckFile("run.exe", "", 10)).toMatch(/Unsupported/);
  });
  it("enforces size limits", () => {
    expect(precheckFile("big.mp4", "video/mp4", 201 * 1024 * 1024)).toMatch(/limit/);
    expect(precheckFile("ok.mp4", "video/mp4", 50 * 1024 * 1024)).toBeNull();
    expect(precheckFile("empty.jpg", "image/jpeg", 0)).toMatch(/empty/);
  });
  it("formats durations", () => expect(formatDuration(12.4)).toBe("0:12"));
});
