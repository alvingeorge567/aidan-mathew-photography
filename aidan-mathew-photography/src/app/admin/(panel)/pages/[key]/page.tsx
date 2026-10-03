import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getMediaOptions } from "@/lib/data/admin";
import { AdminHeader } from "@/components/admin/AdminShell";
import { EntityEditor } from "@/components/admin/EntityEditor";
import { PAGE_PATHS, PAGE_SCHEMAS, PAGE_TITLES, PREVIEWABLE_PAGES, isPageKey, withPageDefaults } from "@/lib/content/pages";

export const metadata = { title: "Edit page" };

export default async function EditPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!isPageKey(key)) notFound();
  const { db } = await requireAdmin();
  const { data: row } = await db.from("pages").select("*").eq("key", key).maybeSingle();
  if (!row) notFound();
  const media = await getMediaOptions(db);
  return (
    <>
      <AdminHeader
        title={`${PAGE_TITLES[key]} page`}
        description="Text in [square brackets] is a placeholder. Replace it before publishing — publishing is blocked while placeholders remain."
      />
      <EntityEditor
        table="pages"
        id={row.id}
        schema={PAGE_SCHEMAS[key]}
        initial={withPageDefaults(key, row.draft)}
        status={row.status}
        hasUnpublishedChanges={row.has_unpublished_changes}
        ctx={{ media }}
        previewHref={PREVIEWABLE_PAGES.includes(key) ? `/preview/page/${key}` : undefined}
        liveHref={PAGE_PATHS[key]}
        backHref="/admin/pages"
      />
    </>
  );
}
