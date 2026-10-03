import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { SETTINGS_DEFAULTS } from "@/lib/content/entities";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Admin", template: "%s — Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const { data } = await admin.db.from("site_settings").select("data").eq("id", 1).maybeSingle();
  const name = (data?.data?.business_name as string) || SETTINGS_DEFAULTS.business_name;
  return (
    <AdminShell name={admin.displayName} businessName={name}>
      {children}
    </AdminShell>
  );
}
