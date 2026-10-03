"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { audit, requireAdminAction } from "@/lib/auth";
import type { ActionResult } from "@/lib/admin-types";
import {
  BLOCK_FIELDS, BLOCK_TYPES, ENTITY_DEFAULTS, ENTITY_SCHEMAS, SETTINGS_DEFAULTS, SETTINGS_SCHEMA,
  isEntityTable, type BlockType, type EntityTable, type StoryBlock,
} from "@/lib/content/entities";
import { PAGE_SCHEMAS, isPageKey, withPageDefaults } from "@/lib/content/pages";
import {
  allFields, collectMediaIds, collectMediaIdsFromFields, isPlaceholder, missingRequired, sanitizeBySchema, sanitizeObject,
  type Field, type Schema, type Values,
} from "@/lib/content/schema";
import { slugify } from "@shared/slug";
import { dbError, fail, revalidatePublic, syncPlacements, toResult } from "./util";

const ENTITY_TYPE: Record<EntityTable, string> = { pages: "page", services: "service", films: "film", stories: "story" };

async function loadRow(db: Awaited<ReturnType<typeof requireAdminAction>>["db"], table: EntityTable, id: string) {
  const { data, error } = await db.from(table).select("*").eq("id", id).maybeSingle();
  if (error || !data) throw new Error("This item no longer exists.");
  return data as Record<string, any>;
}

function schemaFor(table: EntityTable, row: Record<string, any>): Schema {
  if (table === "pages") {
    if (!isPageKey(row.key)) throw new Error("Unknown page.");
    return PAGE_SCHEMAS[row.key];
  }
  return ENTITY_SCHEMAS[table];
}

function sanitizeBlocks(raw: unknown): StoryBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 80)
    .filter((b): b is { type: BlockType; data: Values } => !!b && BLOCK_TYPES.includes((b as StoryBlock).type))
    .map((b) => ({ type: b.type, data: sanitizeObject(BLOCK_FIELDS[b.type], b.data ?? {}) }));
}

function blockMediaIds(blocks: StoryBlock[]): string[] {
  const out = new Set<string>();
  for (const b of blocks) collectMediaIdsFromFields(BLOCK_FIELDS[b.type], b.data, out);
  return [...out];
}

/** Lists fields that still contain [bracketed placeholder] text. */
function placeholderFields(fields: Field[], data: Values, prefix = ""): string[] {
  const found: string[] = [];
  for (const f of fields) {
    const v = data[f.name];
    if (isPlaceholder(v) || (typeof v === "string" && /\[[^\]\n]{3,}\]/.test(v))) found.push(`${prefix}${f.label}`);
    if (f.type === "list" && Array.isArray(v)) v.forEach((item, i) => found.push(...placeholderFields(f.fields, item as Values, `${prefix}${f.itemLabel} ${i + 1} → `)));
  }
  return found;
}

export async function saveEntity(table: string, id: string, data: Values, blocks?: unknown): Promise<ActionResult> {
  try {
    const admin = await requireAdminAction();
    if (!isEntityTable(table)) return fail("Unknown content type.");
    const row = await loadRow(admin.db, table, id);
    const schema = schemaFor(table, row);
    const clean = sanitizeBySchema(schema, data);

    const update: Record<string, unknown> = {
      draft: clean,
      has_unpublished_changes: true,
      updated_by: admin.user.id,
    };
    if (table !== "pages") {
      const slug = slugify(String(clean.slug || clean.title || ""));
      if (!slug) return fail("Add a title or URL name before saving.");
      clean.slug = slug;
      update.slug = slug;
      update.sort_order = typeof clean.sort_order === "number" ? clean.sort_order : 0;
    }

    const { error } = await admin.db.from(table).update(update).eq("id", id);
    if (error) return fail(dbError(error, "The draft couldn't be saved"));

    let mediaIds = collectMediaIds(schema, clean);
    if (table === "stories") {
      const cleanBlocks = sanitizeBlocks(blocks);
      const { error: blockError } = await admin.db.rpc("replace_story_blocks", {
        p_story_id: id,
        p_blocks: cleanBlocks.map((b) => ({ type: b.type, data: b.data })),
      });
      if (blockError) return fail(dbError(blockError, "The story sections couldn't be saved"));
      mediaIds = [...mediaIds, ...blockMediaIds(cleanBlocks)];
    }
    await syncPlacements(admin.db, ENTITY_TYPE[table], id, mediaIds);
    await audit(admin, "content.draft_saved", ENTITY_TYPE[table], id);
    revalidatePath(`/admin/${table}`);
    return { ok: true, message: "Draft saved. The live site is unchanged until you publish." };
  } catch (e) {
    return toResult(e);
  }
}

export async function publishEntity(table: string, id: string): Promise<ActionResult> {
  try {
    const admin = await requireAdminAction();
    if (!isEntityTable(table)) return fail("Unknown content type.");
    const row = await loadRow(admin.db, table, id);
    const schema = schemaFor(table, row);
    const draft: Values =
      table === "pages" ? withPageDefaults(row.key, row.draft) : { ...ENTITY_DEFAULTS[table as Exclude<EntityTable, "pages">], ...row.draft };

    const missing = missingRequired(schema, draft);
    if (missing.length) return fail(`Fill in these fields before publishing: ${missing.join(", ")}.`);

    const placeholders = placeholderFields(allFields(schema), draft);
    if (placeholders.length) {
      return fail(`Replace the placeholder text before publishing: ${placeholders.join("; ")}.`);
    }

    let blocks: StoryBlock[] = [];
    if (table === "stories") {
      const { data } = await admin.db.from("story_blocks").select("block_type, data").eq("story_id", id).order("position");
      blocks = (data ?? []).map((b) => ({ type: b.block_type as BlockType, data: b.data as Values }));
      const unapproved = blocks.filter((b) => b.type === "quote" && b.data.text && b.data.permission_confirmed !== true);
      if (unapproved.length) return fail("Confirm that each quotation was approved for publication, or remove it.");
    }

    const mediaIds = [...collectMediaIds(schema, draft), ...blockMediaIds(blocks)];
    if (mediaIds.length) {
      const { data: assets } = await admin.db
        .from("media_assets")
        .select("id, title, original_filename, media_type, processing_status, publication_status")
        .in("id", mediaIds);
      const problems = (assets ?? []).filter((a) => a.processing_status !== "ready" || a.publication_status !== "published");
      if (problems.length) {
        const names = problems.map((a) => `“${a.title || a.original_filename}”`).join(", ");
        return fail(`These media items must be Ready and published before this can go live: ${names}. Open them in Media and choose Publish.`);
      }
      if (table === "films") {
        const video = (assets ?? []).find((a) => a.id === draft.video_id);
        if (!video || video.media_type !== "video") return fail("Choose a video for this film.");
      }
    }

    const published = table === "stories" ? { ...draft, blocks } : draft;
    const update: Record<string, unknown> = {
      published,
      status: "published",
      has_unpublished_changes: false,
      published_at: new Date().toISOString(),
    };
    if (table === "films") update.featured = draft.featured === true;

    const { error } = await admin.db.from(table).update(update).eq("id", id);
    if (error) return fail(dbError(error, "Publishing failed"));
    await admin.db.from("content_revisions").insert({ entity_type: ENTITY_TYPE[table], entity_id: id, snapshot: published, published_by: admin.user.id });
    await audit(admin, "content.published", ENTITY_TYPE[table], id);
    revalidatePublic();
    revalidatePath(`/admin/${table}`);
    return { ok: true, message: "Published. The live site now shows this version." };
  } catch (e) {
    return toResult(e);
  }
}

export async function setEntityStatus(table: string, id: string, status: "draft" | "archived"): Promise<ActionResult> {
  try {
    const admin = await requireAdminAction();
    if (!isEntityTable(table)) return fail("Unknown content type.");
    if (table === "pages" && status === "archived") return fail("Pages can be unpublished but not archived.");
    const { error } = await admin.db.from(table).update({ status }).eq("id", id);
    if (error) return fail(dbError(error, "The status couldn't be changed"));
    await audit(admin, status === "archived" ? "content.archived" : "content.unpublished", ENTITY_TYPE[table], id);
    revalidatePublic();
    revalidatePath(`/admin/${table}`);
    return { ok: true, message: status === "archived" ? "Archived. It is no longer on the live site." : "Unpublished. It is no longer on the live site." };
  } catch (e) {
    return toResult(e);
  }
}

export async function deleteEntity(table: string, id: string): Promise<ActionResult> {
  try {
    const admin = await requireAdminAction();
    if (!isEntityTable(table) || table === "pages") return fail("This item can't be deleted.");
    const { error } = await admin.db.from(table).delete().eq("id", id);
    if (error) return fail(dbError(error, "Delete failed"));
    await admin.db.from("media_placements").delete().eq("entity_type", ENTITY_TYPE[table]).eq("entity_id", id);
    await audit(admin, "content.deleted", ENTITY_TYPE[table], id);
    revalidatePublic();
    revalidatePath(`/admin/${table}`);
    return { ok: true, message: "Deleted." };
  } catch (e) {
    return toResult(e);
  }
}

export async function createEntity(formData: FormData) {
  const admin = await requireAdminAction();
  const table = String(formData.get("table"));
  if (!isEntityTable(table) || table === "pages") throw new Error("Unknown content type.");
  const suffix = Math.random().toString(36).slice(2, 7);
  const label = { services: "service", films: "film", stories: "story" }[table];
  const draft = { ...ENTITY_DEFAULTS[table], title: `Untitled ${label}`, slug: `untitled-${label}-${suffix}` };
  const { data, error } = await admin.db.from(table).insert({ slug: draft.slug, draft, updated_by: admin.user.id }).select("id").single();
  if (error || !data) throw new Error(dbError(error, "Couldn't create the item"));
  await audit(admin, "content.created", ENTITY_TYPE[table], data.id);
  redirect(`/admin/${table}/${data.id}`);
}

export async function saveSettings(data: Values): Promise<ActionResult> {
  try {
    const admin = await requireAdminAction();
    const clean = sanitizeBySchema(SETTINGS_SCHEMA, data);
    if (!clean.business_name) return fail("The business name can't be empty.");
    clean.booking_capacity_per_date = typeof clean.booking_capacity_per_date === "number" ? clean.booking_capacity_per_date : 1;
    const nav = (clean.nav as { label: string; href: string }[]).filter((n) => n.label && n.href);
    clean.nav = nav.length ? nav : SETTINGS_DEFAULTS.nav;
    const { error } = await admin.db.from("site_settings").upsert({ id: 1, data: clean, updated_by: admin.user.id, updated_at: new Date().toISOString() });
    if (error) return fail(dbError(error, "Settings couldn't be saved"));
    await syncPlacements(admin.db, "settings", "1", collectMediaIds(SETTINGS_SCHEMA, clean));
    await audit(admin, "settings.saved", "settings", "1");
    revalidatePublic();
    return { ok: true, message: "Settings saved and applied to the live site." };
  } catch (e) {
    return toResult(e);
  }
}
