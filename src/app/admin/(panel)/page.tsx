import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { countRows } from "@/lib/data/admin";
import { AdminHeader } from "@/components/admin/AdminShell";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const { db } = await requireAdmin();
  const [media, processing, failed, stories, inquiries, reviews, bookings, upcoming, emailFailures, home] = await Promise.all([
    countRows(db, "media_assets"),
    countRows(db, "media_assets", (q) => q.in("processing_status", ["uploading", "validating", "processing"])),
    countRows(db, "media_assets", (q) => q.eq("processing_status", "failed")),
    countRows(db, "stories", (q) => q.eq("status", "published")),
    countRows(db, "contact_inquiries", (q) => q.eq("status", "new")),
    countRows(db, "reviews", (q) => q.eq("status", "pending")),
    countRows(db, "booking_requests", (q) => q.eq("status", "new")),
    countRows(db, "booking_requests", (q) => q.eq("status", "confirmed").gte("event_date", new Date().toISOString().slice(0, 10))),
    countRows(db, "notification_jobs", (q) => q.eq("status", "failed")),
    db.from("pages").select("status").eq("key", "home").maybeSingle(),
  ]);
  const { data: recent } = await db
    .from("booking_requests")
    .select("id, reference, name, event_date, status, created_at")
    .order("created_at", { ascending: false })
    .limit(6);

  const tiles = [
    { label: "New booking requests", value: bookings, href: "/admin/bookings?status=new" },
    { label: "New inquiries", value: inquiries, href: "/admin/inquiries?status=new" },
    { label: "Reviews awaiting approval", value: reviews, href: "/admin/reviews?status=pending" },
    { label: "Upcoming confirmed bookings", value: upcoming, href: "/admin/bookings?status=confirmed" },
    { label: "Published stories", value: stories, href: "/admin/stories" },
    { label: "Media items", value: media, href: "/admin/media" },
  ];

  return (
    <>
      <AdminHeader title="Dashboard" description="Live totals from the database." />
      {home.data?.status !== "published" ? (
        <div className="mb-6 border-l-4 border-champagne bg-white p-4 text-sm">
          The homepage hasn’t been published, so visitors see placeholder content with a development banner.{" "}
          <Link href="/admin/pages" className="underline">Review and publish your pages</Link>.
        </div>
      ) : null}
      {failed || processing || emailFailures ? (
        <div className="mb-6 space-y-1 border-l-4 border-[#9b2c1f]/60 bg-white p-4 text-sm">
          {processing ? <p>{processing} media item(s) are being processed.</p> : null}
          {failed ? <p><Link className="underline" href="/admin/media?status=failed">{failed} media item(s) failed processing</Link>.</p> : null}
          {emailFailures ? <p>{emailFailures} email notification(s) failed. Check the email provider settings, then retry from the related inquiry or booking.</p> : null}
        </div>
      ) : null}
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link href={t.href} className="a-card block p-5 hover:border-body">
              <p className="font-serif text-4xl">{t.value ?? "—"}</p>
              <p className="mt-1 text-sm text-body/75">{t.label}</p>
            </Link>
          </li>
        ))}
      </ul>
      <section className="mt-10">
        <h2 className="font-serif text-2xl">Latest booking requests</h2>
        {recent?.length ? (
          <div className="a-card mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone text-xs text-body/70">
                <tr><th className="p-3">Reference</th><th className="p-3">Name</th><th className="p-3">Event date</th><th className="p-3">Status</th><th className="p-3">Received</th></tr>
              </thead>
              <tbody>
                {recent.map((b) => (
                  <tr key={b.id} className="border-b border-stone last:border-0">
                    <td className="p-3"><Link className="underline" href={`/admin/bookings/${b.id}`}>{b.reference}</Link></td>
                    <td className="p-3">{b.name}</td>
                    <td className="p-3">{b.event_date ?? "—"}</td>
                    <td className="p-3"><StatusBadge status={b.status} /></td>
                    <td className="p-3">{new Date(b.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-body/70">No booking requests yet. They appear here as soon as someone submits the booking form.</p>
        )}
      </section>
    </>
  );
}
