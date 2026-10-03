import { describe, expect, it } from "vitest";
import { BOOKING_REQUEST_NOTICE, allowedTransitions, canTransition } from "@shared/booking-rules";

describe("booking workflow", () => {
  it("follows New → Contacted → Proposal Sent → Confirmed", () => {
    expect(canTransition("new", "contacted")).toBe(true);
    expect(canTransition("contacted", "proposal_sent")).toBe(true);
    expect(canTransition("proposal_sent", "confirmed")).toBe(true);
  });
  it("does not allow skipping straight to confirmed", () => {
    expect(canTransition("new", "confirmed")).toBe(false);
    expect(canTransition("contacted", "confirmed")).toBe(false);
  });
  it("treats declined and cancelled as final", () => {
    expect(allowedTransitions("declined")).toEqual([]);
    expect(allowedTransitions("cancelled")).toEqual([]);
    expect(allowedTransitions("confirmed")).toEqual(["cancelled"]);
  });
  it("states that a request is not a booking", () => expect(BOOKING_REQUEST_NOTICE).toMatch(/confirmed only after the studio reviews and accepts it/));
});
