import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminHeader } from "@/components/admin/AdminShell";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const metadata = { title: "Inquiries" };

const STATUSES = ["new", "in_progress", "closed", "spam"];

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const { db } = await requireAdmin();
  let q = db.from("contact_inquiries").select("id, reference, name, email, inquiry_type, status, created_at").order("created_at", { ascending: false }).limit(200);
  if (sp.status && STATUSES.includes(sp.status)) q = q.eq("status", sp.status);
  if (sp.q) {
    const term = sp.q.replace(/[%,()]/g, "");
    q = q.or(`name.ilike.%${term}%,email.ilike.%${term}%,reference.ilike.%${term}%`);
  }
  const { data: rows } = await q;
  return (
    <>
      <AdminHeader title="Inquiries" description="Messages from the contact form and homepage. Every inquiry is saved before the visitor sees a confirmation." />
      <form className="mb-5 flex flex-wrap items-end gap-3" role="search">
        <label className="a-label">Search<input name="q" defaultValue={sp.q} className="a-input" placeholder="Name, email or reference" /></label>
        <label className="a-label">
          Status
          <select name="status" defaultValue={sp.status ?? ""} className="a-input">
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
        </label>
        <button className="a-btn">Filter</button>
      </form>
      {rows?.length ? (
        <div className="a-card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone text-xs text-body/70">
              <tr><th className="p-3">Reference</th><th className="p-3">From</th><th className="p-3">Type</th><th className="p-3">Status</th><th className="p-3">Received</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-stone last:border-0">
                  <td className="p-3"><Link className="font-medium underline" href={`/admin/inquiries/${r.id}`}>{r.reference}</Link></td>
                  <td className="p-3">{r.name}<br /><span className="text-xs text-body/60">{r.email}</span></td>
                  <td className="p-3">{r.inquiry_type}</td>
                  <td className="p-3"><StatusBadge status={r.status} /></td>
                  <td className="p-3 text-body/70">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-body/70">No inquiries match.</p>
      )}
    </>
  );
}
