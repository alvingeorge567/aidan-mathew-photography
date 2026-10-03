import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminHeader } from "@/components/admin/AdminShell";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ActionForm } from "@/components/admin/ActionForm";
import { addAvailabilityBlock, removeAvailabilityBlock } from "@/app/admin/actions/records";
import { BOOKING_STATUSES, BOOKING_STATUS_LABELS } from "@shared/booking-rules";

export const metadata = { title: "Bookings" };

type Search = { searchParams: Promise<{ status?: string; q?: string; from?: string; to?: string }> };

export default async function BookingsPage({ searchParams }: Search) {
  const sp = await searchParams;
  const { db } = await requireAdmin();
  let q = db
    .from("booking_requests")
    .select("id, reference, name, partner_name, email, event_type, event_date, city, service_slug, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (sp.status && (BOOKING_STATUSES as readonly string[]).includes(sp.status)) q = q.eq("status", sp.status);
  if (sp.from) q = q.gte("event_date", sp.from);
  if (sp.to) q = q.lte("event_date", sp.to);
  if (sp.q) {
    const term = sp.q.replace(/[%,()]/g, "");
    q = q.or(`name.ilike.%${term}%,email.ilike.%${term}%,reference.ilike.%${term}%,partner_name.ilike.%${term}%`);
  }
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: rows, error }, { data: blocks }, { data: confirmed }, { data: settings }] = await Promise.all([
    q,
    db.from("availability_blocks").select("id, block_date, reason").gte("block_date", today).order("block_date"),
    db.from("booking_requests").select("event_date").eq("status", "confirmed").gte("event_date", today).order("event_date").limit(100),
    db.from("site_settings").select("data").eq("id", 1).maybeSingle(),
  ]);
  const capacity = Number(settings?.data?.booking_capacity_per_date ?? 1) || 1;

  return (
    <>
      <AdminHeader
        title="Bookings"
        description={`Requests never reserve a date on their own. Confirming checks the date's capacity (${capacity} per date, set in Settings) and blocked dates.`}
      />
      <div className="grid gap-8 2xl:grid-cols-[1fr_340px]">
        <div>
          <form className="mb-5 flex flex-wrap items-end gap-3" role="search">
            <label className="a-label">Search<input name="q" defaultValue={sp.q} className="a-input" placeholder="Name, email or reference" /></label>
            <label className="a-label">
              Status
              <select name="status" defaultValue={sp.status ?? ""} className="a-input">
                <option value="">All</option>
                {BOOKING_STATUSES.map((s) => <option key={s} value={s}>{BOOKING_STATUS_LABELS[s]}</option>)}
              </select>
            </label>
            <label className="a-label">Event from<input type="date" name="from" defaultValue={sp.from} className="a-input" /></label>
            <label className="a-label">to<input type="date" name="to" defaultValue={sp.to} className="a-input" /></label>
            <button className="a-btn" type="submit">Filter</button>
          </form>
          {error ? <p role="alert" className="text-sm text-[#9b2c1f]">{error.message}</p> : null}
          {rows?.length ? (
            <div className="a-card overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-stone text-xs text-body/70">
                  <tr><th className="p-3">Reference</th><th className="p-3">Client</th><th className="p-3">Event</th><th className="p-3">Date</th><th className="p-3">Status</th><th className="p-3">Received</th></tr>
                </thead>
                <tbody>
                  {rows.map((b) => (
                    <tr key={b.id} className="border-b border-stone last:border-0">
                      <td className="p-3"><Link href={`/admin/bookings/${b.id}`} className="font-medium underline">{b.reference}</Link></td>
                      <td className="p-3">{b.name}{b.partner_name ? ` & ${b.partner_name}` : ""}<br /><span className="text-xs text-body/60">{b.email}</span></td>
                      <td className="p-3">{b.event_type}<br /><span className="text-xs text-body/60">{b.city}</span></td>
                      <td className="p-3 whitespace-nowrap">{b.event_date ?? "—"}</td>
                      <td className="p-3"><StatusBadge status={b.status} /></td>
                      <td className="p-3 whitespace-nowrap text-body/70">{new Date(b.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-body/70">No booking requests match.</p>
          )}
        </div>

        <aside className="space-y-6">
          <section className="a-card p-5" aria-labelledby="blocks-title">
            <h2 id="blocks-title" className="font-serif text-2xl">Unavailable dates</h2>
            <p className="a-help">Blocked dates can't be confirmed, and visitors are told the date is unavailable. Reasons stay private.</p>
            <ActionForm action={addAvailabilityBlock} resetOnSuccess className="mt-4 space-y-3">
              {(pending) => (
                <>
                  <label className="a-label">Date<input type="date" name="block_date" required min={today} className="a-input" /></label>
                  <label className="a-label">Private reason<input name="reason" className="a-input" placeholder="e.g. Travelling" /></label>
                  <button className="a-btn-primary" disabled={pending}>Block date</button>
                </>
              )}
            </ActionForm>
            <ul className="mt-5 divide-y divide-stone text-sm">
              {(blocks ?? []).map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-2">
                  <span>{b.block_date}{b.reason ? <span className="text-body/60"> — {b.reason}</span> : null}</span>
                  <ActionForm action={removeAvailabilityBlock} confirm={`Unblock ${b.block_date}?`}>
                    <input type="hidden" name="id" value={b.id} />
                    <button className="text-xs underline">Remove</button>
                  </ActionForm>
                </li>
              ))}
              {!blocks?.length ? <li className="py-2 text-body/60">No upcoming blocked dates.</li> : null}
            </ul>
          </section>
          <section className="a-card p-5" aria-labelledby="confirmed-title">
            <h2 id="confirmed-title" className="font-serif text-2xl">Confirmed dates</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {(confirmed ?? []).map((c, i) => <li key={i}>{c.event_date}</li>)}
              {!confirmed?.length ? <li className="text-body/60">No upcoming confirmed bookings.</li> : null}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
