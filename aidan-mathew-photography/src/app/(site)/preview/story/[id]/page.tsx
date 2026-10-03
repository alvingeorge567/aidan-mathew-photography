import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getPreviewMedia } from "@/lib/data/admin";
import { StoryView } from "@/components/views/StoryView";
import { blockMediaIds } from "@/components/site/StoryBlocksView";
import { STORY_DEFAULTS, type BlockType, type StoryBlock } from "@/lib/content/entities";
import type { Values } from "@/lib/content/schema";

export default async function PreviewStory({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await requireAdmin();
  const { data: row } = await db.from("stories").select("draft").eq("id", id).maybeSingle();
  if (!row) notFound();
  const { data: blockRows } = await db.from("story_blocks").select("block_type, data").eq("story_id", id).order("position");
  const blocks: StoryBlock[] = (blockRows ?? []).map((b) => ({ type: b.block_type as BlockType, data: b.data as Values }));
  const content = { ...STORY_DEFAULTS, ...row.draft };
  const media = await getPreviewMedia(db, [String(content.cover_id ?? ""), ...blockMediaIds(blocks)]);
  return <StoryView content={content} blocks={blocks} media={media} />;
}
