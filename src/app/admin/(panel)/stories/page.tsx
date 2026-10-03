import { requireAdmin } from "@/lib/auth";
import { AdminHeader } from "@/components/admin/AdminShell";
import { EntityList } from "@/components/admin/EntityList";

export const metadata = { title: "Wedding stories" };

export default async function Page() {
  const { db } = await requireAdmin();
  const { data } = await db.from("stories").select("id, draft, status, has_unpublished_changes, updated_at").order("sort_order").order("updated_at", { ascending: false });
  return (
    <>
      <AdminHeader title="Wedding stories" description="Build stories from text, photographs, galleries, short videos and approved quotations." />
      <EntityList table="stories" rows={data ?? []} empty="No stories yet." extraColumn={(r) => String(r.draft?.category ?? "")} />
    </>
  );
}
