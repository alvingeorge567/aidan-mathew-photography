import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getMediaOptions } from "@/lib/data/admin";
import { categoryOptions, storyOptions } from "@/lib/data/editor";
import { AdminHeader } from "@/components/admin/AdminShell";
import { EntityEditor } from "@/components/admin/EntityEditor";
import { FILM_DEFAULTS, FILM_SCHEMA } from "@/lib/content/entities";

export const metadata = { title: "Edit film" };

export default async function EditFilm({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await requireAdmin();
  const { data: row } = await db.from("films").select("*").eq("id", id).maybeSingle();
  if (!row) notFound();
  const [media, categories, stories] = await Promise.all([getMediaOptions(db), categoryOptions(db, "films"), storyOptions(db)]);
  const initial = { ...FILM_DEFAULTS, ...row.draft };
  return (
    <>
      <AdminHeader title={String(initial.title || "Film")} description="Choose a processed 10–15 second video. Edit categories under Pages → Films." />
      <EntityEditor
        table="films"
        id={id}
        schema={FILM_SCHEMA}
        initial={initial}
        status={row.status}
        hasUnpublishedChanges={row.has_unpublished_changes}
        ctx={{ media, dynamicOptions: { category: categories, story_id: stories } }}
        previewHref={`/preview/film/${id}`}
        liveHref={`/films/${row.published?.slug ?? row.slug}`}
        backHref="/admin/films"
        canDelete
      />
    </>
  );
}
