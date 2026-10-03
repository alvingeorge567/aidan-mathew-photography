import { describe, expect, it } from "vitest";
import { CLIENT_PHOTOS, CLIENT_PHOTO_SLOTS, clientPhotoId, fillEmpty, fillStorytelling } from "@/lib/client-photos";
import { PAGE_DEFAULTS } from "@/lib/content/pages";

const keys = new Set(CLIENT_PHOTOS.map((p) => p.key));

describe("client photo manifest", () => {
  it("lists HTTPS images from the studio's site", () => {
    for (const p of CLIENT_PHOTOS) expect(p.url).toMatch(/^https:\/\/www\.aidanmphotography\.com\/uploads\/.+\.(jpe?g|png|webp)$/);
  });
  it("only assigns photos that exist in the manifest", () => {
    const used = [
      ...Object.values(CLIENT_PHOTO_SLOTS.home),
      ...Object.values(CLIENT_PHOTO_SLOTS.services),
      ...CLIENT_PHOTO_SLOTS.filmPosters,
      CLIENT_PHOTO_SLOTS.storytelling.hero_image_id,
      ...CLIENT_PHOTO_SLOTS.storytelling.passages,
    ];
    for (const k of used) expect(keys.has(k)).toBe(true);
  });
  it("fills empty slots but never overrides the owner's choices", () => {
    const owner = "3f2b7a1e-1111-4a5b-9c9d-123456789abc";
    const out = fillEmpty({ hero_image_id: owner, about_image_id: "" }, CLIENT_PHOTO_SLOTS.home);
    expect(out.hero_image_id).toBe(owner);
    expect(out.about_image_id).toBe(clientPhotoId(CLIENT_PHOTO_SLOTS.home.about_image_id));
  });
  it("adds photos to storytelling passages that have no media", () => {
    const out = fillStorytelling(PAGE_DEFAULTS.storytelling);
    expect((out.passages as { image_id: string }[]).every((p) => p.image_id.startsWith("client-photo:"))).toBe(true);
  });
});
