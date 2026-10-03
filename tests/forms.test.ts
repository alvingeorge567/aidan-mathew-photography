import { describe, expect, it } from "vitest";
import { bookingSchema, inquirySchema, reviewSchema } from "@/lib/validation";

const future = new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10);
const key = "6a1d2c3b-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const booking = { event_type: "Wedding", event_date: future, city: "Boston", name: "Ana", email: "ANA@Example.com ", privacy_ack: "on", idempotency_key: key };

describe("booking form validation", () => {
  it("accepts a complete request and normalizes email", () => {
    const r = bookingSchema.safeParse(booking);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("ana@example.com");
  });
  it("requires the privacy acknowledgment", () => expect(bookingSchema.safeParse({ ...booking, privacy_ack: undefined }).success).toBe(false));
  it("rejects past dates", () => expect(bookingSchema.safeParse({ ...booking, event_date: "2001-01-01" }).success).toBe(false));
  it("rejects invalid phone characters", () => expect(bookingSchema.safeParse({ ...booking, phone: "<script>" }).success).toBe(false));
});

describe("inquiry and review validation", () => {
  it("keeps phone and event date optional", () => {
    expect(inquirySchema.safeParse({ name: "Ana", email: "a@b.co", message: "Hello there, quick question.", idempotency_key: key }).success).toBe(true);
  });
  it("requires permission to publish a review", () => {
    expect(reviewSchema.safeParse({ display_name: "Ana", review_text: "Wonderful from start to finish.", idempotency_key: key }).success).toBe(false);
  });
});
