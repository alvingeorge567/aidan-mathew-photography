"use server";

import { revalidatePath } from "next/cache";
import { audit, requireAdminAction } from "@/lib/auth";
import type { ActionResult } from "@/lib/admin-types";
import { BOOKING_STATUSES, type BookingStatus } from "@shared/booking-rules";
import { dbError, fail, revalidatePublic, toResult } from "./util";

// ---------------------------------------------------------------- bookings

export async function changeBookingStatus(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const admin = await requireAdminAction();
    const id = String(fd.get("id"));
    const status = String(fd.get("status")) as BookingStatus;
    if (!BOOKING_STATUSES.includes(status)) return fail("Unknown status.");
    // The database function checks the transition and, for confirmations, the date's capacity under a lock.
    const { error } = await admin.db.rpc("update_booking_status", { p_id: id, p_status: status });
    if (error) return fail(error.message || "The status couldn't be changed.");
    revalidatePath("/admin/bookings");
    revalidatePath(`/admin/bookings/${id}`);
    return { ok: true, message: "Status updated." };
  } catch (e) {
    return toResult(e);
  }
}

export async function saveBookingNotes(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const admin = await requireAdminAction();
    const id = String(fd.get("id"));
    const notes = String(fd.get("private_notes") ?? "").slice(0, 10000);
    const { error } = await admin.db.from("booking_requests").update({ private_notes: notes }).eq("id", id);
    if (error) return fail(dbError(error, "Notes couldn't be saved"));
    await audit(admin, "booking.notes_saved", "booking_request", id);
    return { ok: true, message: "Notes saved." };
  } catch (e) {
    return toResult(e);
  }
}

export async function addAvailabilityBlock(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const admin = await requireAdminAction();
    const date = String(fd.get("block_date") ?? "");
    const reason = String(fd.get("reason") ?? "").slice(0, 300);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("Choose a date.");
    const { count } = await admin.db.from("booking_requests").select("id", { count: "exact", head: true }).eq("event_date", date).eq("status", "confirmed");
    const { error } = await admin.db.from("availability_blocks").insert({ block_date: date, reason, created_by: admin.user.id });
    if (error) return fail(error.code === "23505" ? "That date is already blocked." : dbError(error, "The date couldn't be blocked"));
    await audit(admin, "availability.blocked", "availability", date);
    revalidatePath("/admin/bookings");
    return {
      ok: true,
      message: count ? `Date blocked. Note: ${count} confirmed booking(s) already exist on this date.` : "Date blocked.",
    };
  } catch (e) {
    return toResult(e);
  }
}

export async function removeAvailabilityBlock(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const admin = await requireAdminAction();
    const id = String(fd.get("id"));
    const { error } = await admin.db.from("availability_blocks").delete().eq("id", id);
    if (error) return fail(dbError(error, "The block couldn't be removed"));
    await audit(admin, "availability.unblocked", "availability", id);
    revalidatePath("/admin/bookings");
    return { ok: true, message: "Block removed." };
  } catch (e) {
    return toResult(e);
  }
}

// ---------------------------------------------------------------- inquiries

const INQUIRY_STATUSES = ["new", "in_progress", "closed", "spam"];

export async function updateInquiry(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const admin = await requireAdminAction();
    const id = String(fd.get("id"));
    const status = String(fd.get("status"));
    if (!INQUIRY_STATUSES.includes(status)) return fail("Unknown status.");
    const { error } = await admin.db
      .from("contact_inquiries")
      .update({ status, private_notes: String(fd.get("private_notes") ?? "").slice(0, 10000) })
      .eq("id", id);
    if (error) return fail(dbError(error, "Changes couldn't be saved"));
    await audit(admin, "inquiry.updated", "contact_inquiry", id, { status });
    revalidatePath("/admin/inquiries");
    return { ok: true, message: "Saved." };
  } catch (e) {
    return toResult(e);
  }
}

export async function retryNotification(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const admin = await requireAdminAction();
    const id = String(fd.get("id"));
    const { error } = await admin.db
      .from("notification_jobs")
      .update({ status: "pending", attempts: 0, next_attempt_at: new Date().toISOString(), last_error: null })
      .eq("id", id);
    if (error) return fail(dbError(error, "Couldn't queue the email again"));
    await audit(admin, "notification.retry", "notification", id);
    return { ok: true, message: "Queued. The worker will try to send it again shortly." };
  } catch (e) {
    return toResult(e);
  }
}

// ---------------------------------------------------------------- reviews

export async function moderateReview(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const admin = await requireAdminAction();
    const id = String(fd.get("id"));
    const op = String(fd.get("op"));
    const { data: r } = await admin.db.from("reviews").select("status, publication_permission").eq("id", id).maybeSingle();
    if (!r) return fail("This review no longer exists.");
    let update: Record<string, unknown>;
    switch (op) {
      case "approve":
        if (!r.publication_permission) return fail("This review has no publication permission, so it can't be approved.");
        update = { status: "approved" };
        break;
      case "reject":
        update = { status: "rejected", featured: false };
        break;
      case "hide":
        update = { status: "hidden", featured: false };
        break;
      case "feature":
        if (r.status !== "approved") return fail("Approve the review before featuring it.");
        update = { featured: true };
        break;
      case "unfeature":
        update = { featured: false };
        break;
      default:
        return fail("Unknown action.");
    }
    const { error } = await admin.db
      .from("reviews")
      .update({ ...update, moderated_by: admin.user.id, moderated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return fail(dbError(error, "The review couldn't be updated"));
    await audit(admin, `review.${op}`, "review", id);
    revalidatePublic();
    revalidatePath("/admin/reviews");
    return { ok: true, message: "Review updated." };
  } catch (e) {
    return toResult(e);
  }
}

/** For reviews received by email or in person. The text is stored exactly as entered and can't be edited later. */
export async function createReview(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const admin = await requireAdminAction();
    const name = String(fd.get("display_name") ?? "").trim().slice(0, 120);
    const text = String(fd.get("review_text") ?? "").trim().slice(0, 4000);
    const rating = Number(fd.get("rating"));
    if (!name || text.length < 10) return fail("Add the client's display name and their review text.");
    if (fd.get("publication_permission") !== "on") return fail("Confirm the client gave permission to publish this review.");
    const { error } = await admin.db.from("reviews").insert({
      display_name: name,
      review_text: text,
      rating: rating >= 1 && rating <= 5 ? rating : null,
      event_type: String(fd.get("event_type") ?? "").slice(0, 80),
      admin_note: String(fd.get("admin_note") ?? "").slice(0, 2000),
      publication_permission: true,
      source: "admin",
      status: "pending",
    });
    if (error) return fail(dbError(error, "The review couldn't be added"));
    await audit(admin, "review.added", "review", null);
    revalidatePath("/admin/reviews");
    return { ok: true, message: "Review added as pending. Approve it to publish." };
  } catch (e) {
    return toResult(e);
  }
}
