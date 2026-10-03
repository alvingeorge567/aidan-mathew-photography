import { requireAdmin } from "@/lib/auth";
import { AdminHeader } from "@/components/admin/AdminShell";
import { EntityList } from "@/components/admin/EntityList";

export const metadata = { title: "Services" };

export default async function Page() {
  const { db } = await requireAdmin();
  const { data } = await db.from("services").select("id, draft, status, has_unpublished_changes, updated_at").order("sort_order").order("updated_at", { ascending: false });
  return (
    <>
      <AdminHeader title="Services" description="Service descriptions, deliverables and optional pricing. Hide any service the studio doesn't offer by leaving it unpublished." />
      <EntityList table="services" rows={data ?? []} empty="No services yet." />
    </>
  );
}
