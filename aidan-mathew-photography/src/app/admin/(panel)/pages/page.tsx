import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminHeader } from "@/components/admin/AdminShell";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { PAGE_KEYS, PAGE_PATHS, PAGE_TITLES } from "@/lib/content/pages";

export const metadata = { title: "Pages" };

export default async function PagesList() {
  const { db } = await requireAdmin();
  const { data } = await db.from("pages").select("key, status, has_unpublished_changes, updated_at");
  const byKey = new Map((data ?? []).map((p) => [p.key, p]));
  return (
    <>
      <AdminHeader title="Pages" description="Edit page text, photos and search settings. Unpublished pages show placeholder content on the live site." />
      <div className="a-card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone text-xs text-body/70">
            <tr><th className="p-3">Page</th><th className="p-3">Address</th><th className="p-3">Status</th></tr>
          </thead>
          <tbody>
            {PAGE_KEYS.map((key) => {
              const p = byKey.get(key);
              return (
                <tr key={key} className="border-b border-stone last:border-0">
                  <td className="p-3"><Link href={`/admin/pages/${key}`} className="font-medium underline-offset-2 hover:underline">{PAGE_TITLES[key]}</Link></td>
                  <td className="p-3 text-body/70">{PAGE_PATHS[key]}</td>
                  <td className="p-3">
                    {p ? (
                      <span className="flex flex-wrap gap-1">
                        <StatusBadge status={p.status} />
                        {p.status === "published" && p.has_unpublished_changes ? <StatusBadge status="changes" label="unpublished changes" /> : null}
                      </span>
                    ) : (
                      <span className="text-[#9b2c1f]">Missing — run supabase/seed.sql</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
