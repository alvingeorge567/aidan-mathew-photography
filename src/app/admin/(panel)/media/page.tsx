import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { signedThumbs } from "@/lib/data/admin";
import { AdminHeader } from "@/components/admin/AdminShell";
import { MediaUploader } from "@/components/admin/MediaUploader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { formatDuration } from "@shared/media-rules";

export const metadata = { title: "Media" };

const PAGE_SIZE = 48;
type Search = { searchParams: Promise<{ type?: string; status?: string; pub?: string; q?: string; page?: string }> };

export default async function MediaPage({ searchParams }: Search) {
  const sp = await searchParams;
  const { db } = await requireAdmin();
  const page = Math.max(1, Number(sp.page) || 1);
  let q = db
    .from("media_assets")
    .select("id, media_type, title, original_filename, processing_status, publication_status, has_unpublished_changes, duration_seconds, width, height, error_message, derivatives_prefix, derivatives, category, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (sp.type === "image" || sp.type === "video") q = q.eq("media_type", sp.type);
  if (sp.status && ["uploading", "validating", "processing", "ready", "failed"].includes(sp.status)) q = q.eq("processing_status", sp.status);
  if (sp.pub === "published" || sp.pub === "unpublished") q = q.eq("publication_status", sp.pub);
  if (sp.q) q = q.or(`title.ilike.%${sp.q.replace(/[%,()]/g, "")}%,original_filename.ilike.%${sp.q.replace(/[%,()]/g, "")}%,category.ilike.%${sp.q.replace(/[%,()]/g, "")}%`);
  const { data, count, error } = await q;
  const rows = data ?? [];
  const thumbs = await signedThumbs(db, rows);
  const busy = rows.some((r) => ["uploading", "validating", "processing"].includes(r.processing_status));
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const qs = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    Object.entries({ ...sp, ...p }).forEach(([k, v]) => v && u.set(k, v));
    return `/admin/media?${u.toString()}`;
  };

  return (
    <>
      <AutoRefresh active={busy} />
      <AdminHeader title="Media" description="Upload photos and 10–15 second videos. Files are checked and processed in the background, and stay private until you publish them." />
      <MediaUploader />

      <form className="mt-8 flex flex-wrap items-end gap-3" role="search">
        <label className="a-label">
          Search
          <input name="q" defaultValue={sp.q} className="a-input" placeholder="Title, file name or category" />
        </label>
        <label className="a-label">
          Type
          <select name="type" defaultValue={sp.type ?? ""} className="a-input">
            <option value="">All</option><option value="image">Photos</option><option value="video">Videos</option>
          </select>
        </label>
        <label className="a-label">
          Processing
          <select name="status" defaultValue={sp.status ?? ""} className="a-input">
            <option value="">All</option>
            {["uploading", "validating", "processing", "ready", "failed"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="a-label">
          Visibility
          <select name="pub" defaultValue={sp.pub ?? ""} className="a-input">
            <option value="">All</option><option value="published">Published</option><option value="unpublished">Not published</option>
          </select>
        </label>
        <button className="a-btn" type="submit">Filter</button>
      </form>

      {error ? <p role="alert" className="mt-6 text-sm text-[#9b2c1f]">Couldn't load media: {error.message}</p> : null}
      {rows.length === 0 && !error ? (
        <p className="mt-10 text-sm text-body/70">{sp.q || sp.type || sp.status || sp.pub ? "No media matches these filters." : "No media yet. Upload your first photos or videos above."}</p>
      ) : null}

      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
        {rows.map((m) => (
          <li key={m.id}>
            <Link href={`/admin/media/${m.id}`} className="a-card block overflow-hidden hover:border-body">
              <div className="relative aspect-[4/3] bg-stone">
                {thumbs[m.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbs[m.id]} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-xs text-body/60">{m.processing_status === "failed" ? "Failed" : "Processing…"}</span>
                )}
                {m.media_type === "video" ? (
                  <span className="absolute bottom-1 right-1 bg-ink/75 px-1.5 py-0.5 text-[11px] text-ivory">▶ {formatDuration(Number(m.duration_seconds)) || "video"}</span>
                ) : null}
              </div>
              <div className="space-y-1.5 p-3">
                <p className="truncate text-sm font-medium">{m.title || m.original_filename}</p>
                <div className="flex flex-wrap gap-1">
                  <StatusBadge status={m.processing_status} />
                  <StatusBadge status={m.publication_status} />
                  {m.has_unpublished_changes ? <StatusBadge status="changes" label="new version" /> : null}
                </div>
                {m.processing_status === "failed" && m.error_message ? <p className="line-clamp-2 text-xs text-[#9b2c1f]">{m.error_message}</p> : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {pages > 1 ? (
        <nav className="mt-8 flex items-center gap-3 text-sm" aria-label="Media pages">
          {page > 1 ? <Link className="a-btn" href={qs({ page: String(page - 1) })}>Previous</Link> : null}
          <span>Page {page} of {pages}</span>
          {page < pages ? <Link className="a-btn" href={qs({ page: String(page + 1) })}>Next</Link> : null}
        </nav>
      ) : null}
    </>
  );
}
