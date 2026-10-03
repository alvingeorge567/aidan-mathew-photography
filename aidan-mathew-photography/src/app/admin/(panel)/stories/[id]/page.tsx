import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getMediaOptions } from "@/lib/data/admin";
import { categoryOptions } from "@/lib/data/editor";
import { AdminHeader } from "@/components/admin/AdminShell";
import { EntityEditor } from "@/components/admin/EntityEditor";
import { STORY_DEFAULTS, STORY_SCHEMA, type BlockType, type StoryBlock } from "@/lib/content/entities";
import type { Values } from "@/lib/content/schema";

export const metadata = { title: "Edit story" };

export default async function EditStory({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await requireAdmin();
  const { data: row } = await db.from("stories").select("*").eq("id", id).maybeSingle();
  if (!row) notFound();
  const [media, categories, { data: blockRows }] = await Promise.all([
    getMediaOptions(db),
    categoryOptions(db, "storytelling"),
    db.from("story_blocks").select("block_type, data").eq("story_id", id).order("position"),
  ]);
  const blocks: StoryBlock[] = (blockRows ?? []).map((b) => ({ type: b.block_type as BlockType, data: (b.data ?? {}) as Values }));
  const initial = { ...STORY_DEFAULTS, ...row.draft };
  return (
    <>
      <AdminHeader title={String(initial.title || "Story")} description="Only details the couple agreed to share should appear here. Date and location are hidden unless you choose to show them." />
      <EntityEditor
        table="stories"
        id={id}
        schema={STORY_SCHEMA}
        initial={initial}
        initialBlocks={blocks}
        status={row.status}
        hasUnpublishedChanges={row.has_unpublished_changes}
        ctx={{ media, dynamicOptions: { category: categories } }}
        previewHref={`/preview/story/${id}`}
        liveHref={`/stories/${row.published?.slug ?? row.slug}`}
        backHref="/admin/stories"
        canDelete
      />
    </>
  );
}
