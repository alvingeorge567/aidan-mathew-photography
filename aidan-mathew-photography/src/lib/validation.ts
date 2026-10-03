import { z } from "zod";

const trimmed = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters.`);
const optionalText = (max: number) => trimmed(max).optional().default("");
const email = z.string().trim().toLowerCase().max(254).email("Enter a valid email address, like name@example.com.");
const phone = z
  .string()
  .trim()
  .max(40)
  .regex(/^[+()\d\s.-]*$/, "Use digits, spaces and + ( ) - only.")
  .optional()
  .default("");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.");

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export const bookingSchema = z.object({
  event_type: trimmed(80).min(1, "Choose the type of event."),
  event_date: isoDate.refine((d) => d >= todayISO(), "Choose a date in the future."),
  venue: optionalText(200),
  city: trimmed(120).min(1, "Enter the city or area."),
  service_slug: optionalText(80),
  coverage_notes: optionalText(2000),
  name: trimmed(120).min(1, "Enter your name."),
  partner_name: optionalText(120),
  email,
  phone,
  preferred_contact: z.enum(["email", "phone", "either"]).default("email"),
  budget_range: optionalText(80),
  message: optionalText(5000),
  referral_source: optionalText(120),
  privacy_ack: z.literal("on", { errorMap: () => ({ message: "Please confirm you have read the privacy notice." }) }),
  idempotency_key: z.string().uuid("Please reload the page and try again."),
});
export type BookingInput = z.infer<typeof bookingSchema>;

export const BOOKING_FIELD_STEP: Record<string, number> = {
  event_type: 0, event_date: 0, venue: 0, city: 0, service_slug: 0, coverage_notes: 0,
  name: 1, partner_name: 1, email: 1, phone: 1, preferred_contact: 1, budget_range: 1,
  message: 2, referral_source: 2, privacy_ack: 2, idempotency_key: 2,
};

export const inquirySchema = z.object({
  name: trimmed(120).min(1, "Enter your name."),
  email,
  inquiry_type: trimmed(80).optional().default("General question"),
  phone,
  event_date: z.union([z.literal(""), isoDate]).optional().default(""),
  message: trimmed(5000).min(10, "Tell us a little more (at least 10 characters)."),
  idempotency_key: z.string().uuid("Please reload the page and try again."),
});
export type InquiryInput = z.infer<typeof inquirySchema>;

export const reviewSchema = z.object({
  display_name: trimmed(120).min(1, "Enter the name you'd like shown."),
  review_text: trimmed(4000).min(10, "Please write at least a sentence."),
  rating: z.union([z.literal(""), z.coerce.number().int().min(1).max(5)]).optional().default(""),
  event_type: optionalText(80),
  submitter_email: z.union([z.literal(""), email]).optional().default(""),
  publication_permission: z.literal("on", { errorMap: () => ({ message: "We can only publish your review with your permission." }) }),
  idempotency_key: z.string().uuid("Please reload the page and try again."),
});

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

export function formObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  fd.forEach((v, k) => {
    if (typeof v === "string" && !k.startsWith("$ACTION")) out[k] = v;
  });
  return out;
}
