import { requireAdmin } from "@/lib/auth";
import { getMediaOptions } from "@/lib/data/admin";
import { AdminHeader } from "@/components/admin/AdminShell";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { SETTINGS_DEFAULTS, SETTINGS_SCHEMA } from "@/lib/content/entities";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { db } = await requireAdmin();
  const [{ data }, media] = await Promise.all([db.from("site_settings").select("data").eq("id", 1).maybeSingle(), getMediaOptions(db)]);
  const initial = { ...SETTINGS_DEFAULTS, ...(data?.data ?? {}) };
  return (
    <>
      <AdminHeader title="Settings" description="Business name, branding, contact details, social links, navigation and booking rules." />
      <SettingsForm schema={SETTINGS_SCHEMA} initial={initial} ctx={{ media }} />
    </>
  );
}
