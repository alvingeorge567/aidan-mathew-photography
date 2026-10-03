"use server";

import { serviceClient } from "@/lib/supabase/service";
import { publicClient } from "@/lib/supabase/public";
import type { FormState } from "@/lib/forms";
import { bookingSchema, formObject, inquirySchema, reviewSchema, zodFieldErrors } from "@/lib/validation";
import { allowRequest, clientIpHash, looksLikeSpam } from "@/lib/request-guard";
import type { DateAvailability } from "@shared/booking-rules";
import { getPage } from "@/lib/data/public";

const NOT_CONFIGURED: FormState = {
  status: "error",
  message: "This form isn't connected to the studio's database yet, so nothing was sent. Please contact the studio by email instead.",
};
const SPAM: FormState = {
  status: "error",
  message: "We couldn't send that. Please check your details, wait a moment, and try again.",
};
const RATE_LIMITED: FormState = {
  status: "error",
  message: "Too many submissions from this connection. Please wait an hour or email the studio directly.",
};
const SAVE_FAILED: FormState = {
  status: "error",
  message: "Your details weren't saved because of a problem on our side. Please try again in a few minutes.",
};

function isUniqueViolation(err: { code?: string } | null) {
  return err?.code === "23505";
}

export async function checkDateAvailability(date: string): Promise<DateAvailability> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "unknown";
  const db = publicClient();
  if (!db) return "unknown";
  const { data, error } = await db.rpc("date_availability", { p_date: date });
  if (error || typeof data !== "string") return "unknown";
  return data as DateAvailability;
}

export async function submitBooking(_prev: FormState, fd: FormData): Promise<FormState> {
  const db = serviceClient();
  if (!db) return NOT_CONFIGURED;
  if (looksLikeSpam(fd)) return SPAM;

  const parsed = bookingSchema.safeParse(formObject(fd));
  if (!parsed.success) {
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error) };
  }
  const input = parsed.data;

  // Same form submitted twice (double click, retry after a slow network): return the original reference.
  const existing = await db.from("booking_requests").select("reference").eq("idempotency_key", input.idempotency_key).maybeSingle();
  if (existing.data) return { status: "success", reference: existing.data.reference };

  const ipHash = await clientIpHash();
  if (!(await allowRequest(db, `booking:${ipHash}`, 5, 3600))) return RATE_LIMITED;

  // Same person, same date, within ten minutes: treat as a duplicate.
  const recent = await db
    .from("booking_requests")
    .select("reference")
    .eq("email", input.email)
    .eq("event_date", input.event_date)
    .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
    .limit(1)
    .maybeSingle();
  if (recent.data) return { status: "success", reference: recent.data.reference, message: "duplicate" };

  const { privacy_ack: _ack, ...row } = input;
  const { data, error } = await db
    .from("booking_requests")
    .insert({ ...row, privacy_ack_at: new Date().toISOString(), ip_hash: ipHash })
    .select("id, reference")
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      const again = await db.from("booking_requests").select("reference").eq("idempotency_key", input.idempotency_key).maybeSingle();
      if (again.data) return { status: "success", reference: again.data.reference };
    }
    console.error("booking insert failed", error.message);
    return SAVE_FAILED;
  }

  // The request is saved. Notifications are queued for the worker; a failure here never loses the request.
  const payload = {
    reference: data.reference,
    name: input.name,
    partner_name: input.partner_name,
    email: input.email,
    phone: input.phone,
    preferred_contact: input.preferred_contact,
    event_type: input.event_type,
    event_date: input.event_date,
    venue: input.venue,
    city: input.city,
    service_slug: input.service_slug,
    budget_range: input.budget_range,
    message: input.message,
  };
  const { error: notifyError } = await db.from("notification_jobs").insert([
    { kind: "booking_ack", to_email: input.email, payload, related_type: "booking_request", related_id: data.id },
    { kind: "booking_studio", to_email: null, payload, related_type: "booking_request", related_id: data.id },
  ]);
  if (notifyError) console.error("could not queue booking notifications", notifyError.message);

  return { status: "success", reference: data.reference };
}

export async function submitInquiry(_prev: FormState, fd: FormData): Promise<FormState> {
  const db = serviceClient();
  if (!db) return NOT_CONFIGURED;
  if (looksLikeSpam(fd)) return SPAM;

  const parsed = inquirySchema.safeParse(formObject(fd));
  if (!parsed.success) {
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error) };
  }
  const input = parsed.data;

  const existing = await db.from("contact_inquiries").select("reference").eq("idempotency_key", input.idempotency_key).maybeSingle();
  if (existing.data) return { status: "success", reference: existing.data.reference };

  const ipHash = await clientIpHash();
  if (!(await allowRequest(db, `inquiry:${ipHash}`, 8, 3600))) return RATE_LIMITED;

  const { data, error } = await db
    .from("contact_inquiries")
    .insert({ ...input, event_date: input.event_date || null, ip_hash: ipHash })
    .select("id, reference")
    .single();
  if (error) {
    if (isUniqueViolation(error)) {
      const again = await db.from("contact_inquiries").select("reference").eq("idempotency_key", input.idempotency_key).maybeSingle();
      if (again.data) return { status: "success", reference: again.data.reference };
    }
    console.error("inquiry insert failed", error.message);
    return SAVE_FAILED;
  }

  const payload = { reference: data.reference, ...input };
  const { error: notifyError } = await db.from("notification_jobs").insert([
    { kind: "inquiry_ack", to_email: input.email, payload, related_type: "contact_inquiry", related_id: data.id },
    { kind: "inquiry_studio", to_email: null, payload, related_type: "contact_inquiry", related_id: data.id },
  ]);
  if (notifyError) console.error("could not queue inquiry notifications", notifyError.message);

  return { status: "success", reference: data.reference };
}

export async function submitReview(_prev: FormState, fd: FormData): Promise<FormState> {
  const db = serviceClient();
  if (!db) return NOT_CONFIGURED;
  const page = await getPage("reviews");
  if (!page.published || page.content.submissions_enabled !== true) {
    return { status: "error", message: "Review submissions are not open at the moment." };
  }
  if (looksLikeSpam(fd)) return SPAM;

  const parsed = reviewSchema.safeParse(formObject(fd));
  if (!parsed.success) {
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors: zodFieldErrors(parsed.error) };
  }
  const input = parsed.data;
  const ipHash = await clientIpHash();
  if (!(await allowRequest(db, `review:${ipHash}`, 3, 3600))) return RATE_LIMITED;

  const { data, error } = await db
    .from("reviews")
    .insert({
      display_name: input.display_name,
      review_text: input.review_text,
      rating: input.rating === "" ? null : input.rating,
      event_type: input.event_type,
      submitter_email: input.submitter_email || null,
      publication_permission: true,
      source: "submission",
      status: "pending",
      idempotency_key: input.idempotency_key,
    })
    .select("id")
    .single();
  if (error) {
    if (isUniqueViolation(error)) return { status: "success" };
    console.error("review insert failed", error.message);
    return SAVE_FAILED;
  }
  await db.from("notification_jobs").insert({
    kind: "review_studio",
    payload: { display_name: input.display_name },
    related_type: "review",
    related_id: data.id,
  });
  return { status: "success" };
}
