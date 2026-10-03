import { config } from "./config.ts";
import { db } from "./supabase.ts";

export type NotificationJob = {
  id: string;
  kind: "booking_ack" | "booking_studio" | "inquiry_ack" | "inquiry_studio" | "review_studio";
  to_email: string | null;
  payload: Record<string, string>;
  attempts: number;
  max_attempts: number;
};

type Email = { to: string; subject: string; text: string; replyTo?: string };

export class EmailNotConfigured extends Error {}

const line = (label: string, value?: string) => (value ? `${label}: ${value}\n` : "");

/** Plain-text templates. The booking acknowledgment never states that a date is reserved. */
export function renderEmail(job: NotificationJob, studio: { name: string; email: string; notify: string }, adminUrl: string): Email {
  const p = job.payload ?? {};
  const sign = `\n— ${studio.name}${studio.email ? `\n${studio.email}` : ""}`;
  switch (job.kind) {
    case "booking_ack":
      return {
        to: job.to_email ?? "",
        replyTo: studio.email || undefined,
        subject: `We received your availability request (${p.reference})`,
        text:
          `Dear ${p.name},\n\nThank you for reaching out. We've received your request for ${p.event_date}` +
          `${p.city ? ` in ${p.city}` : ""}.\n\nYour reference number is ${p.reference}.\n\n` +
          `Please note: this is a request, not a confirmed booking. Your date is not reserved until the studio reviews your request and confirms it with you directly.\n\n` +
          `We'll be in touch personally.\n${sign}`,
      };
    case "booking_studio":
      return {
        to: studio.notify,
        replyTo: p.email,
        subject: `New booking request ${p.reference}: ${p.event_type}, ${p.event_date}`,
        text:
          `A new availability request was submitted.\n\n` +
          line("Reference", p.reference) + line("Name", p.name) + line("Partner", p.partner_name) + line("Email", p.email) +
          line("Phone", p.phone) + line("Preferred contact", p.preferred_contact) + line("Event", p.event_type) +
          line("Date", p.event_date) + line("Venue", p.venue) + line("City", p.city) + line("Service", p.service_slug) +
          line("Budget", p.budget_range) + (p.message ? `\nMessage:\n${p.message}\n` : "") +
          (adminUrl ? `\nOpen the request: ${adminUrl}/admin/bookings\n` : ""),
      };
    case "inquiry_ack":
      return {
        to: job.to_email ?? "",
        replyTo: studio.email || undefined,
        subject: `We received your message (${p.reference})`,
        text: `Dear ${p.name},\n\nThank you for your message. We read every one and will reply personally.\n\nYour reference: ${p.reference}\n${sign}`,
      };
    case "inquiry_studio":
      return {
        to: studio.notify,
        replyTo: p.email,
        subject: `New inquiry ${p.reference}: ${p.inquiry_type}`,
        text:
          line("Reference", p.reference) + line("Name", p.name) + line("Email", p.email) + line("Phone", p.phone) +
          line("Event date", p.event_date) + `\n${p.message ?? ""}\n` + (adminUrl ? `\nOpen inquiries: ${adminUrl}/admin/inquiries\n` : ""),
      };
    case "review_studio":
      return {
        to: studio.notify,
        subject: `New review awaiting approval from ${p.display_name}`,
        text: `A new review was submitted and is waiting for approval.${adminUrl ? `\n\n${adminUrl}/admin/reviews` : ""}`,
      };
  }
}

async function send(email: Email) {
  const { provider, resendApiKey, from } = config.email;
  if (provider !== "resend" || !resendApiKey || !from) {
    throw new EmailNotConfigured("Email is not configured (set EMAIL_PROVIDER=resend, RESEND_API_KEY and EMAIL_FROM on the worker).");
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [email.to], subject: email.subject, text: email.text, ...(email.replyTo ? { reply_to: email.replyTo } : {}) }),
  });
  if (!res.ok) throw new Error(`Email provider responded ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

export async function processNotificationJob(job: NotificationJob) {
  const { data } = await db().from("site_settings").select("data").eq("id", 1).maybeSingle();
  const s = (data?.data ?? {}) as Record<string, string>;
  const studio = { name: s.business_name || "The studio", email: s.email || "", notify: s.notification_email || s.email || "" };
  const done = (fields: Record<string, unknown>) => db().from("notification_jobs").update(fields).eq("id", job.id);

  try {
    const email = renderEmail(job, studio, config.email.siteUrl);
    if (!email.to) throw new Error("No recipient. Add a notification email under Admin → Settings.");
    await send(email);
    await done({ status: "sent", sent_at: new Date().toISOString(), last_error: null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Unconfigured email: keep the job pending (attempts not consumed) and check again in 15 minutes.
    if (err instanceof EmailNotConfigured) {
      await done({ status: "pending", attempts: Math.max(0, job.attempts - 1), last_error: msg, next_attempt_at: new Date(Date.now() + 15 * 60_000).toISOString() });
      return;
    }
    const final = job.attempts >= job.max_attempts;
    const backoffMin = Math.min(240, 2 ** job.attempts);
    await done(
      final
        ? { status: "failed", last_error: msg }
        : { status: "pending", last_error: msg, next_attempt_at: new Date(Date.now() + backoffMin * 60_000).toISOString() },
    );
  }
}
