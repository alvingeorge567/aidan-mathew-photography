import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getPreviewMedia } from "@/lib/data/admin";
import { FilmView } from "@/components/views/FilmView";
import { FILM_DEFAULTS } from "@/lib/content/entities";

export default async function PreviewFilm({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await requireAdmin();
  const { data: row } = await db.from("films").select("draft").eq("id", id).maybeSingle();
  if (!row) notFound();
  const content = { ...FILM_DEFAULTS, ...row.draft };
  const media = await getPreviewMedia(db, [String(content.video_id ?? ""), String(content.poster_id ?? "")]);
  return <FilmView content={content} media={media} />;
}
