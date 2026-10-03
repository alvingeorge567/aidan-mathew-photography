import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { AdminHeader } from "@/components/admin/AdminShell";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ActionForm } from "@/components/admin/ActionForm";
import { changeBookingStatus, retryNotification, saveBookingNotes } from "@/app/admin/actions/records";
import { BOOKING_STATUS_LABELS, allowedTransitions, type BookingStatus } from "@shared/booking-rules";

export const metadata = { title: "Booking request" };

export default async function BookingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await requireAdmin();
  const { data: b } = await db.from("booking_requests").select("*").eq("id", id).maybeSingle();
  if (!b) notFound();
  const [{ data: notifications }, { data: history }, { data: sameDate }, { data: block }] = await Promise.all([
    db.from("notification_jobs").select("id, kind, status, attempts, last_error, sent_at").eq("related_id", id).order("created_at"),
    db.from("audit_logs").select("action, details, created_at").eq("entity_type", "booking_request").eq("entity_id", id).order("created_at", { ascending: false }).limit(20),
    b.event_date ? db.from("booking_requests").select("id, reference, status").eq("event_date", b.event_date).neq("id", id) : Promise.resolve({ data: [] as { id: string; reference: string; status: string }[] }),
    b.event_date ? db.from("availability_blocks").select("reason").eq("block_date", b.event_date).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const transitions = allowedTransitions(b.status as BookingStatus);

  const rows: [string, string | null][] = [
    ["Event type", b.event_type], ["Preferred date", b.event_date], ["Venue", b.venue], ["City or area", b.city],
    ["Service", b.service_slug], ["Coverage", b.coverage_notes], ["Name", b.name], ["Partner", b.partner_name],
    ["Email", b.email], ["Phone", b.phone], ["Preferred contact", b.preferred_contact], ["Budget", b.budget_range],
    ["How they heard", b.referral_source], ["Privacy notice acknowledged", new Date(b.privacy_ack_at).toLocaleString()],
  ];

  return (
    <>
      <p className="mb-4 text-sm"><Link href="/admin/bookings" className="hover:underline">← Bookings</Link></p>
      <AdminHeader title={`Request ${b.reference}`} description={<span className="flex items-center gap-2"><StatusBadge status={b.status} /> Received {new Date(b.created_at).toLocaleString()}</span>} />
      <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="a-card p-5">
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[180px_1fr]">
              {rows.filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-body/60">{k}</dt>
                  <dd className="whitespace-pre-line">{k === "Email" ? <a className="underline" href={`mailto:${v}`}>{v}</a> : v}</dd>
                </div>
              ))}
            </dl>
            {b.message ? (
              <div className="mt-6 border-t border-stone pt-4">
                <h2 className="text-sm font-medium">Message</h2>
                <p className="mt-2 whitespace-pre-line text-sm">{b.message}</p>
              </div>
            ) : null}
          </section>
          {block || sameDate?.length ? (
            <section className="a-card border-l-4 border-l-champagne p-5 text-sm">
              <h2 className="font-medium">Same date</h2>
              {block ? <p className="mt-1">This date is blocked{block.reason ? `: ${block.reason}` : ""}.</p> : null}
              <ul className="mt-1">
                {(sameDate ?? []).map((o) => (
                  <li key={o.id}><Link className="underline" href={`/admin/bookings/${o.id}`}>{o.reference}</Link> — {BOOKING_STATUS_LABELS[o.status as BookingStatus]}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
        <div className="space-y-6">
          <section className="a-card p-5">
            <h2 className="font-serif text-2xl">Status</h2>
            {transitions.length ? (
              <ActionForm action={changeBookingStatus} confirm="Change the status of this request?" className="mt-3">
                {(pending) => (
                  <>
                    <input type="hidden" name="id" value={b.id} />
                    <div className="flex flex-wrap gap-2">
                      {transitions.map((t) => (
                        <button key={t} name="status" value={t} className={t === "confirmed" ? "a-btn-primary" : t === "declined" || t === "cancelled" ? "a-btn-danger" : "a-btn"} disabled={pending}>
                          Mark as {BOOKING_STATUS_LABELS[t].toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </ActionForm>
            ) : (
              <p className="mt-2 text-sm text-body/70">This request is {BOOKING_STATUS_LABELS[b.status as BookingStatus].toLowerCase()} and can’t be moved further.</p>
            )}
          </section>
          <section className="a-card p-5">
            <h2 className="font-serif text-2xl">Private notes</h2>
            <ActionForm action={saveBookingNotes} className="mt-3">
              {(pending) => (
                <>
                  <input type="hidden" name="id" value={b.id} />
                  <textarea name="private_notes" rows={6} defaultValue={b.private_notes} className="a-input" aria-label="Private notes" />
                  <button className="a-btn-primary mt-3" disabled={pending}>Save notes</button>
                </>
              )}
            </ActionForm>
          </section>
          <section className="a-card p-5 text-sm">
            <h2 className="font-serif text-2xl">Emails</h2>
            <ul className="mt-3 space-y-2">
              {(notifications ?? []).map((n) => (
                <li key={n.id} className="flex flex-wrap items-center gap-2">
                  <span>{n.kind === "booking_ack" ? "Acknowledgment to client" : "Notification to studio"}</span>
                  <StatusBadge status={n.status} />
                  {n.last_error ? <span className="text-xs text-[#9b2c1f]">{n.last_error}</span> : null}
                  {n.status === "failed" ? (
                    <ActionForm action={retryNotification}>
                      <input type="hidden" name="id" value={n.id} />
                      <button className="text-xs underline">Retry</button>
                    </ActionForm>
                  ) : null}
                </li>
              ))}
              {!notifications?.length ? <li className="text-body/60">No emails queued.</li> : null}
            </ul>
          </section>
          {history?.length ? (
            <section className="a-card p-5 text-sm">
              <h2 className="font-serif text-2xl">History</h2>
              <ul className="mt-3 space-y-1 text-body/80">
                {history.map((h, i) => (
                  <li key={i}>{new Date(h.created_at).toLocaleString()} — {h.action.replace("booking.", "").replace("_", " ")} {h.details?.status ? `→ ${h.details.status}` : ""}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
