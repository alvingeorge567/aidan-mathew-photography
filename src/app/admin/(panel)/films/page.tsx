import { requireAdmin } from "@/lib/auth";
import { AdminHeader } from "@/components/admin/AdminShell";
import { EntityList } from "@/components/admin/EntityList";

export const metadata = { title: "Films" };

export default async function Page() {
  const { db } = await requireAdmin();
  const { data } = await db.from("films").select("id, draft, status, has_unpublished_changes, updated_at, featured").order("sort_order").order("updated_at", { ascending: false });
  return (
    <>
      <AdminHeader title="Films" description="Short highlight films (10–15 seconds). Featured films appear on the homepage." />
      <EntityList table="films" rows={data ?? []} empty="No films yet. Upload a video in Media, then create a film here." extraColumn={(r) => String(r.draft?.category ?? "")} />
    </>
  );
}
