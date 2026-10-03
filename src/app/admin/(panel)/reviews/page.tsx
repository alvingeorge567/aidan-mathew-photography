import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminHeader } from "@/components/admin/AdminShell";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ActionForm } from "@/components/admin/ActionForm";
import { createReview, moderateReview } from "@/app/admin/actions/records";

export const metadata = { title: "Reviews" };

const TABS = ["pending", "approved", "hidden", "rejected"] as const;

export default async function ReviewsAdmin({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = (TABS as readonly string[]).includes(sp.status ?? "") ? sp.status! : "pending";
  const { db } = await requireAdmin();
  const { data: reviews } = await db
    .from("reviews")
    .select("id, display_name, review_text, rating, event_type, status, featured, source, publication_permission, submitter_email, admin_note, created_at")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <AdminHeader title="Reviews" description="Reviews appear on the site only after approval and with the client's permission. Review text is kept exactly as submitted." />
      <nav aria-label="Review status" className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link key={t} href={`/admin/reviews?status=${t}`} aria-current={t === status ? "page" : undefined} className="a-btn capitalize aria-[current=page]:border-body aria-[current=page]:bg-body aria-[current=page]:text-ivory">
            {t}
          </Link>
        ))}
      </nav>
      <div className="grid gap-8 xl:grid-cols-[1.5fr_1fr]">
        <ul className="space-y-4">
          {(reviews ?? []).map((r) => (
            <li key={r.id} className="a-card p-5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <strong>{r.display_name}</strong>
                {r.event_type ? <span className="text-body/60">· {r.event_type}</span> : null}
                {r.rating ? <span className="text-bronze">· {r.rating}/5</span> : null}
                <StatusBadge status={r.status} />
                {r.featured ? <StatusBadge status="featured" /> : null}
                <span className="text-xs text-body/60">{r.source === "admin" ? "Added by studio" : "Submitted online"} · {new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              <blockquote className="mt-3 whitespace-pre-line font-serif text-lg leading-relaxed">“{r.review_text}”</blockquote>
              <p className="mt-2 text-xs text-body/60">
                Publication permission: {r.publication_permission ? "given" : "not given"}
                {r.submitter_email ? ` · Private email: ${r.submitter_email}` : ""}
                {r.admin_note ? ` · Note: ${r.admin_note}` : ""}
              </p>
              <ActionForm action={moderateReview} className="mt-4">
                {(pending) => (
                  <div className="flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    {r.status !== "approved" ? <button name="op" value="approve" className="a-btn-primary" disabled={pending}>Approve</button> : null}
                    {r.status === "approved" && !r.featured ? <button name="op" value="feature" className="a-btn" disabled={pending}>Feature on homepage</button> : null}
                    {r.featured ? <button name="op" value="unfeature" className="a-btn" disabled={pending}>Remove from homepage</button> : null}
                    {r.status !== "hidden" ? <button name="op" value="hide" className="a-btn" disabled={pending}>Hide</button> : null}
                    {r.status === "pending" ? <button name="op" value="reject" className="a-btn-danger" disabled={pending}>Reject</button> : null}
                  </div>
                )}
              </ActionForm>
            </li>
          ))}
          {!reviews?.length ? <li className="text-sm text-body/70">No {status} reviews.</li> : null}
        </ul>
        <aside className="a-card h-fit p-5">
          <h2 className="font-serif text-2xl">Add a review you received</h2>
          <p className="a-help">For reviews sent by email or card. Enter the words exactly as the client wrote them.</p>
          <ActionForm action={createReview} resetOnSuccess className="mt-4 space-y-3">
            {(pending) => (
              <>
                <label className="a-label">Display name<input name="display_name" required className="a-input" /></label>
                <label className="a-label">Review text<textarea name="review_text" required rows={6} className="a-input" /></label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="a-label">Rating
                    <select name="rating" className="a-input"><option value="">None</option>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}</select>
                  </label>
                  <label className="a-label">Event type<input name="event_type" className="a-input" /></label>
                </div>
                <label className="a-label">Private note<input name="admin_note" className="a-input" placeholder="Where and when you received it" /></label>
                <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="publication_permission" className="mt-1 h-4 w-4" /> The client gave permission to publish this review with this name.</label>
                <button className="a-btn-primary" disabled={pending}>Add as pending</button>
              </>
            )}
          </ActionForm>
        </aside>
      </div>
    </>
  );
}
