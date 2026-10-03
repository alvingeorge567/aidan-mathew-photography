import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false }, title: "Draft preview" };

export default async function PreviewLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <div role="note" className="fixed inset-x-0 bottom-0 z-50 bg-champagne px-4 py-2 text-center text-sm text-ink">
        Draft preview — only administrators can see this. Visitors still see the published version.
      </div>
      {children}
    </>
  );
}
