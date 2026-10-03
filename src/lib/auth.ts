import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSessionClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export type AdminContext = {
  user: User;
  displayName: string;
  db: Awaited<ReturnType<typeof createSessionClient>>;
};

/**
 * Server-side admin check: a verified Supabase user (getUser() validates the JWT with the
 * auth server) who has an active row in admin_profiles. A browser-supplied role is never trusted.
 */
export async function getAdmin(): Promise<AdminContext | null> {
  if (!isSupabaseConfigured()) return null;
  const db = await createSessionClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  const { data: profile } = await db
    .from("admin_profiles")
    .select("display_name, active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile?.active) return null;
  return { user, displayName: profile.display_name || user.email || "Admin", db };
}

/** For admin pages: redirects to the login page when not authorized. */
export async function requireAdmin(): Promise<AdminContext> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export class NotAuthorizedError extends Error {
  constructor() {
    super("Your session has expired or you do not have admin access. Sign in again.");
  }
}

/** For server actions and route handlers: every privileged mutation calls this first. */
export async function requireAdminAction(): Promise<AdminContext> {
  const admin = await getAdmin();
  if (!admin) throw new NotAuthorizedError();
  return admin;
}

export async function audit(
  admin: AdminContext,
  action: string,
  entityType: string,
  entityId: string | null,
  details: Record<string, unknown> = {},
) {
  await admin.db.from("audit_logs").insert({
    actor_id: admin.user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
  });
}
