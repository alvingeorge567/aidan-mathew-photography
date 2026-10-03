import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { AdminHeader } from "@/components/admin/AdminShell";
import { MediaEditor, type EditableMedia } from "@/components/admin/MediaEditor";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { formatBytes, formatDuration } from "@shared/media-rules";
import { PAGE_DEFAULTS } from "@/lib/content/pages";
import type { DerivativeManifest } from "@/lib/media";

export const metadata = { title: "Edit media" };

export default async function MediaDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await requireAdmin();
  const { data: m } = await db.from("media_assets").select("*").eq("id", id).maybeSingle();
  if (!m) notFound();

  const manifest = (m.derivatives ?? {}) as DerivativeManifest;
  const imgs = (m.media_type === "image" ? manifest.images : manifest.poster) ?? [];
  const mid = [...imgs].sort((a, b) => a.w - b.w).find((x) => x.w >= 1200) ?? imgs.at(-1);
  const vid = [...(manifest.videos ?? [])].sort((a, b) => b.w - a.w)[0];
  const paths = [mid ? `${m.derivatives_prefix}/${mid.file}` : null, vid ? `${m.derivatives_prefix}/${vid.file}` : null].filter(Boolean) as string[];
  const signed = paths.length && m.derivatives_prefix ? (await db.storage.from("media-derivatives").createSignedUrls(paths, 3600)).data ?? [] : [];
  const previewImage = mid ? signed.find((s) => s.path === `${m.derivatives_prefix}/${mid.file}`)?.signedUrl ?? null : null;
  const previewVideo = vid ? signed.find((s) => s.path === `${m.derivatives_prefix}/${vid.file}`)?.signedUrl ?? null : null;

  const [{ data: placement }, { data: stories }, { data: portfolioPage }, { data: jobs }] = await Promise.all([
    db.from("media_placements").select("sort_order").eq("media_id", id).eq("entity_type", "portfolio").maybeSingle(),
    db.from("stories").select("id, draft").order("created_at", { ascending: false }).limit(300),
    db.from("pages").select("draft").eq("key", "portfolio").maybeSingle(),
    db.from("processing_jobs").select("status, attempts, last_error, created_at, finished_at").eq("media_id", id).order("created_at", { ascending: false }).limit(5),
  ]);
  const cats = ((portfolioPage?.draft?.categories ?? PAGE_DEFAULTS.portfolio.categories) as { name?: string }[]).map((c) => c.name ?? "").filter(Boolean);

  const editable: EditableMedia = {
    id: m.id,
    media_type: m.media_type,
    title: m.title ?? "",
    alt_text: m.alt_text ?? "",
    caption: m.caption ?? "",
    category: m.category ?? "",
    focal_x: m.focal_x ?? 50,
    focal_y: m.focal_y ?? 50,
    story_id: m.story_id ?? "",
    permission_confirmed: m.permission_confirmed === true,
    permission_notes: m.permission_notes ?? "",
    processing_status: m.processing_status,
    publication_status: m.publication_status,
    has_unpublished_changes: m.has_unpublished_changes === true,
    in_portfolio: Boolean(placement),
    portfolio_order: placement?.sort_order ?? 0,
  };
  const busy = ["uploading", "validating", "processing"].includes(m.processing_status);

  return (
    <>
      <AutoRefresh active={busy} />
      <p className="mb-4 text-sm"><Link href="/admin/media" className="underline-offset-2 hover:underline">← Media</Link></p>
      <AdminHeader
        title={m.title || m.original_filename || "Media"}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={m.processing_status} />
            <StatusBadge status={m.publication_status} />
            <span>
              {m.media_type === "video" ? `Video · ${formatDuration(Number(m.duration_seconds)) || "duration pending"}` : "Photo"}
              {m.width ? ` · ${m.width}×${m.height}` : ""}
              {m.byte_size ? ` · ${formatBytes(Number(m.byte_size))}` : ""}
              {m.original_filename ? ` · ${m.original_filename}` : ""}
            </span>
          </span>
        }
      />
      {m.processing_status === "failed" && m.error_message ? (
        <p role="alert" className="mb-6 border-l-4 border-[#9b2c1f] bg-white p-4 text-sm">{m.error_message}</p>
      ) : m.error_message ? (
        <p className="mb-6 border-l-4 border-champagne bg-white p-4 text-sm">{m.error_message}</p>
      ) : null}
      {busy ? (
        <p className="mb-6 border-l-4 border-[#2b4a73]/50 bg-white p-4 text-sm">
          {m.processing_status === "uploading" ? "Waiting for the upload to finish." : "Checking the file and creating web versions. This page refreshes automatically."}
        </p>
      ) : null}
      <MediaEditor
        media={editable}
        previewImage={previewImage}
        previewVideo={previewVideo}
        categories={cats}
        stories={(stories ?? []).map((s) => ({ value: s.id, label: String(s.draft?.title ?? "Untitled story") }))}
      />
      {jobs?.length ? (
        <details className="mt-10 text-sm">
          <summary className="cursor-pointer">Processing history</summary>
          <ul className="mt-3 space-y-1">
            {jobs.map((j, i) => (
              <li key={i}>
                {new Date(j.created_at).toLocaleString()} — {j.status} (attempt {j.attempts}){j.last_error ? `: ${j.last_error}` : ""}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </>
  );
}
