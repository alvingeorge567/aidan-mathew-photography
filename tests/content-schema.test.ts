import { describe, expect, it } from "vitest";
import { collectMediaIds, isPlaceholder, missingRequired, sanitizeBySchema } from "@/lib/content/schema";
import { PAGE_DEFAULTS, PAGE_SCHEMAS } from "@/lib/content/pages";
import { FILM_SCHEMA, SETTINGS_SCHEMA } from "@/lib/content/entities";

const ID = "3f2b7a1e-1111-4a5b-9c9d-123456789abc";

describe("schema sanitising", () => {
  it("drops unknown fields and invalid values", () => {
    const out = sanitizeBySchema(FILM_SCHEMA, {
      title: "  Our film ", video_id: ID, poster_id: "not-a-uuid", external_url: "javascript:alert(1)", injected: "x", featured: "true",
    });
    expect(out.title).toBe("Our film");
    expect(out.video_id).toBe(ID);
    expect(out.poster_id).toBe("");
    expect(out.external_url).toBe("");
    expect(out.featured).toBe(true);
    expect("injected" in out).toBe(false);
  });
  it("keeps settings emails valid and clamps capacity", () => {
    const out = sanitizeBySchema(SETTINGS_SCHEMA, { business_name: "Studio", email: "bad", booking_capacity_per_date: 99 });
    expect(out.email).toBe("");
    expect(out.booking_capacity_per_date).toBe(10);
  });
  it("finds media inside nested lists", () => {
    const ids = collectMediaIds(PAGE_SCHEMAS.about, { founder_image_id: ID, team: [{ image_id: ID }], bts: [{ image_id: "nope" }] });
    expect(ids).toEqual([ID]);
  });
  it("reports missing required fields", () => {
    expect(missingRequired(FILM_SCHEMA, { title: "x", slug: "x" })).toContain("Video (10–15 s)");
  });
});

describe("launch safeguards", () => {
  it("default copy marks owner-supplied text as placeholders", () => {
    expect(isPlaceholder(PAGE_DEFAULTS.about.intro)).toBe(true);
    expect(isPlaceholder(PAGE_DEFAULTS.home.about_text)).toBe(true);
  });
  it("hides the statistics strip by default", () => {
    expect(PAGE_DEFAULTS.home.stats_enabled).toBe(false);
    expect(PAGE_DEFAULTS.home.stats).toEqual([]);
  });
  it("uses the headings from the brief", () => {
    expect(PAGE_DEFAULTS.home.services_heading).toBe("More Than Just Coverage");
    expect(PAGE_DEFAULTS.booking.heading).toBe("Let’s Begin Your Story.");
    expect(PAGE_DEFAULTS.contact.heading).toBe("Tell Us About Your Story.");
  });
});
