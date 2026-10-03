import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getMediaOptions } from "@/lib/data/admin";
import { AdminHeader } from "@/components/admin/AdminShell";
import { EntityEditor } from "@/components/admin/EntityEditor";
import { SERVICE_DEFAULTS, SERVICE_SCHEMA } from "@/lib/content/entities";

export const metadata = { title: "Edit service" };

export default async function EditService({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await requireAdmin();
  const { data: row } = await db.from("services").select("*").eq("id", id).maybeSingle();
  if (!row) notFound();
  const media = await getMediaOptions(db);
  const initial = { ...SERVICE_DEFAULTS, ...row.draft };
  return (
    <>
      <AdminHeader title={String(initial.title || "Service")} description="Services are listed on the Services page and as cards on the homepage. Each one links to the booking form with the service preselected." />
      <EntityEditor
        table="services"
        id={id}
        schema={SERVICE_SCHEMA}
        initial={initial}
        status={row.status}
        hasUnpublishedChanges={row.has_unpublished_changes}
        ctx={{ media }}
        liveHref={`/services#${row.published?.slug ?? row.slug}`}
        backHref="/admin/services"
        canDelete
      />
    </>
  );
}
