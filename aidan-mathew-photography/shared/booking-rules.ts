/** Booking workflow. Mirrored by booking_transition_allowed() in the database, which is authoritative. */
export const BOOKING_STATUSES = ["new", "contacted", "proposal_sent", "confirmed", "declined", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  new: "New",
  contacted: "Contacted",
  proposal_sent: "Proposal sent",
  confirmed: "Confirmed",
  declined: "Declined",
  cancelled: "Cancelled",
};

const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  new: ["contacted", "declined", "cancelled"],
  contacted: ["proposal_sent", "declined", "cancelled"],
  proposal_sent: ["confirmed", "declined", "cancelled"],
  confirmed: ["cancelled"],
  declined: [],
  cancelled: [],
};

export function allowedTransitions(from: BookingStatus): BookingStatus[] {
  return TRANSITIONS[from] ?? [];
}

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return allowedTransitions(from).includes(to);
}

export const BOOKING_REQUEST_NOTICE =
  "Submitting this form requests availability. Your booking is confirmed only after the studio reviews and accepts it.";

export type DateAvailability = "open" | "blocked" | "full" | "past" | "unknown";

export function availabilityMessage(a: DateAvailability): string {
  switch (a) {
    case "open":
      return "No confirmed booking or block is recorded for this date yet. Availability is confirmed only after the studio reviews your request.";
    case "full":
      return "This date is already booked. You can still send a request — the studio will reply with options.";
    case "blocked":
      return "The studio has marked this date as unavailable. You can still send a request to ask about alternatives.";
    case "past":
      return "Please choose a date in the future.";
    default:
      return "We couldn't check this date right now. Your request will still be reviewed.";
  }
}
