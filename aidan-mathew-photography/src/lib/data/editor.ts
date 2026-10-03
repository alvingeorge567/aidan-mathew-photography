import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Option } from "@/lib/admin-types";
import { PAGE_DEFAULTS, type PageKey } from "@/lib/content/pages";

/** Category options come from the (draft) page settings for films, stories and the portfolio. */
export async function categoryOptions(db: SupabaseClient, key: PageKey): Promise<Option[]> {
  const { data } = await db.from("pages").select("draft").eq("key", key).maybeSingle();
  const list = ((data?.draft?.categories ?? PAGE_DEFAULTS[key].categories ?? []) as { name?: string }[])
    .map((c) => c.name ?? "")
    .filter(Boolean);
  return list.map((n) => ({ value: n, label: n }));
}

export async function storyOptions(db: SupabaseClient): Promise<Option[]> {
  const { data } = await db.from("stories").select("id, draft, status").neq("status", "archived").order("updated_at", { ascending: false }).limit(300);
  return (data ?? []).map((s) => ({ value: s.id, label: `${String(s.draft?.title ?? "Untitled")}${s.status === "published" ? "" : " (draft)"}` }));
}
