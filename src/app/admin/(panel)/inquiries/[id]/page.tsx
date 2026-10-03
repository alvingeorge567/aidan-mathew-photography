import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { AdminHeader } from "@/components/admin/AdminShell";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ActionForm } from "@/components/admin/ActionForm";
import { retryNotification, updateInquiry } from "@/app/admin/actions/records";

export const metadata = { title: "Inquiry" };

export default async function InquiryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await requireAdmin();
  const { data: r } = await db.from("contact_inquiries").select("*").eq("id", id).maybeSingle();
  if (!r) notFound();
  const { data: notifications } = await db.from("notification_jobs").select("id, kind, status, last_error").eq("related_id", id).order("created_at");
  return (
    <>
      <p className="mb-4 text-sm"><Link href="/admin/inquiries" className="hover:underline">← Inquiries</Link></p>
      <AdminHeader title={`Inquiry ${r.reference}`} description={<span className="flex items-center gap-2"><StatusBadge status={r.status} /> {new Date(r.created_at).toLocaleString()}</span>} />
      <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
        <section className="a-card p-5 text-sm">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[140px_1fr]">
            <dt className="text-body/60">Name</dt><dd>{r.name}</dd>
            <dt className="text-body/60">Email</dt><dd><a className="underline" href={`mailto:${r.email}`}>{r.email}</a></dd>
            <dt className="text-body/60">Type</dt><dd>{r.inquiry_type}</dd>
            {r.phone ? (<><dt className="text-body/60">Phone</dt><dd>{r.phone}</dd></>) : null}
            {r.event_date ? (<><dt className="text-body/60">Event date</dt><dd>{r.event_date}</dd></>) : null}
          </dl>
          <p className="mt-6 whitespace-pre-line border-t border-stone pt-4">{r.message}</p>
        </section>
        <div className="space-y-6">
          <section className="a-card p-5">
            <ActionForm action={updateInquiry} className="space-y-3">
              {(pending) => (
                <>
                  <input type="hidden" name="id" value={r.id} />
                  <label className="a-label">
                    Status
                    <select name="status" defaultValue={r.status} className="a-input">
                      <option value="new">New</option><option value="in_progress">In progress</option><option value="closed">Closed</option><option value="spam">Spam</option>
                    </select>
                  </label>
                  <label className="a-label">Private notes<textarea name="private_notes" rows={6} defaultValue={r.private_notes} className="a-input" /></label>
                  <button className="a-btn-primary" disabled={pending}>Save</button>
                </>
              )}
            </ActionForm>
          </section>
          <section className="a-card p-5 text-sm">
            <h2 className="font-serif text-2xl">Emails</h2>
            <ul className="mt-3 space-y-2">
              {(notifications ?? []).map((n) => (
                <li key={n.id} className="flex flex-wrap items-center gap-2">
                  <span>{n.kind === "inquiry_ack" ? "Acknowledgment to sender" : "Notification to studio"}</span>
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
        </div>
      </div>
    </>
  );
}
