import { describe, expect, it } from "vitest";
import { parseExternalFilm } from "@shared/embeds";
import { isValidSlug, slugify } from "@shared/slug";

describe("external film allowlist", () => {
  it("rebuilds YouTube embeds from the ID", () => {
    expect(parseExternalFilm("https://www.youtube.com/watch?v=dQw4w9WgXcQ")?.embedUrl).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1");
    expect(parseExternalFilm("https://youtu.be/dQw4w9WgXcQ")?.id).toBe("dQw4w9WgXcQ");
  });
  it("supports Vimeo including unlisted hashes", () => {
    expect(parseExternalFilm("https://vimeo.com/123456789")?.embedUrl).toBe("https://player.vimeo.com/video/123456789?dnt=1");
    expect(parseExternalFilm("https://vimeo.com/123456789/abcdef1234")?.embedUrl).toContain("h=abcdef1234");
  });
  it("rejects other providers, http and script injection", () => {
    expect(parseExternalFilm("https://evil.example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(parseExternalFilm("http://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(parseExternalFilm('https://youtube.com/watch?v="><script>')).toBeNull();
    expect(parseExternalFilm("javascript:alert(1)")).toBeNull();
    expect(parseExternalFilm('<iframe src="https://youtube.com/embed/x">')).toBeNull();
  });
});

describe("slugs", () => {
  it("makes readable URL names", () => {
    expect(slugify("Anna & José — Lake Como!")).toBe("anna-and-jose-lake-como");
    expect(isValidSlug("anna-and-jose")).toBe(true);
    expect(isValidSlug("Bad Slug")).toBe(false);
  });
});
