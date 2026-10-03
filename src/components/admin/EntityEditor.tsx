"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { Schema, Values } from "@/lib/content/schema";
import { BLOCK_FIELDS, BLOCK_LABELS, BLOCK_TYPES, type BlockType, type StoryBlock } from "@/lib/content/entities";
import type { ActionResult } from "@/lib/admin-types";
import { deleteEntity, publishEntity, saveEntity, setEntityStatus } from "@/app/admin/actions/content";
import { FieldInput, SchemaFields, type FieldContext } from "./SchemaFields";
import { StatusBadge } from "./StatusBadge";

type Props = {
  table: "pages" | "services" | "films" | "stories";
  id: string;
  schema: Schema;
  initial: Values;
  initialBlocks?: StoryBlock[];
  status: "draft" | "published" | "archived";
  hasUnpublishedChanges: boolean;
  ctx: FieldContext;
  previewHref?: string;
  liveHref?: string;
  backHref: string;
  canDelete?: boolean;
};

/**
 * Draft editor. Saving never changes the live site: Publish copies the saved draft live,
 * so the last published version stays visible until the admin explicitly publishes again.
 */
export function EntityEditor(props: Props) {
  const { table, id, schema, ctx } = props;
  const router = useRouter();
  const [values, setValues] = useState<Values>(props.initial);
  const [blocks, setBlocks] = useState<StoryBlock[]>(props.initialBlocks ?? []);
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify([props.initial, props.initialBlocks ?? []]));
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const dirty = useMemo(() => JSON.stringify([values, blocks]) !== savedSnapshot, [values, blocks, savedSnapshot]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const run = (fn: () => Promise<ActionResult>, after?: (r: ActionResult) => void) =>
    start(async () => {
      const r = await fn();
      setResult(r);
      after?.(r);
      if (r.ok) router.refresh();
    });

  const save = () =>
    run(
      () => saveEntity(table, id, values, table === "stories" ? blocks : undefined),
      (r) => r.ok && setSavedSnapshot(JSON.stringify([values, blocks])),
    );

  const statusLabel = props.status === "published" && props.hasUnpublishedChanges ? "changes" : props.status;

  return (
    <div className="pb-28">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href={props.backHref} className="text-sm underline-offset-2 hover:underline">← Back</Link>
        <StatusBadge status={statusLabel} label={statusLabel === "changes" ? "Published · unpublished changes" : undefined} />
        {props.liveHref && props.status === "published" ? (
          <a href={props.liveHref} target="_blank" rel="noreferrer" className="text-sm text-bronze underline underline-offset-2">View live</a>
        ) : null}
      </div>

      <SchemaFields schema={schema} values={values} onChange={setValues} ctx={ctx} />

      {table === "stories" ? <BlocksEditor blocks={blocks} onChange={setBlocks} ctx={ctx} /> : null}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone bg-white/95 backdrop-blur lg:left-[240px]">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-8 lg:px-10">
          <button type="button" className="a-btn-primary" onClick={save} disabled={pending || !dirty}>
            {pending ? "Working…" : dirty ? "Save draft" : "Saved"}
          </button>
          {props.previewHref ? (
            <a href={props.previewHref} target="_blank" rel="noreferrer" className={`a-btn ${dirty ? "pointer-events-none opacity-50" : ""}`} aria-disabled={dirty}>
              Preview draft
            </a>
          ) : null}
          <button
            type="button"
            className="a-btn"
            disabled={pending || dirty}
            title={dirty ? "Save your draft first" : undefined}
            onClick={() => window.confirm("Publish this version to the live site?") && run(() => publishEntity(table, id))}
          >
            Publish
          </button>
          {props.status === "published" ? (
            <button type="button" className="a-btn" disabled={pending} onClick={() => window.confirm("Remove this from the live site?") && run(() => setEntityStatus(table, id, "draft"))}>
              Unpublish
            </button>
          ) : null}
          {table !== "pages" && props.status !== "archived" ? (
            <button type="button" className="a-btn" disabled={pending} onClick={() => window.confirm("Archive this item? It will be removed from the live site.") && run(() => setEntityStatus(table, id, "archived"))}>
              Archive
            </button>
          ) : null}
          {props.canDelete ? (
            <button
              type="button"
              className="a-btn-danger"
              disabled={pending}
              onClick={() =>
                window.confirm("Delete permanently? This can't be undone.") &&
                run(() => deleteEntity(table, id), (r) => r.ok && router.push(props.backHref))
              }
            >
              Delete
            </button>
          ) : null}
          <p role="status" aria-live="polite" className={`ml-auto text-sm ${result && !result.ok ? "text-[#9b2c1f]" : "text-body/75"}`}>
            {dirty ? "Unsaved changes" : result ? (result.ok ? result.message : result.error) : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

function BlocksEditor({ blocks, onChange, ctx }: { blocks: StoryBlock[]; onChange: (b: StoryBlock[]) => void; ctx: FieldContext }) {
  const [adding, setAdding] = useState<BlockType>("text");
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <section className="a-card mt-8 p-5 sm:p-6" aria-labelledby="blocks-title">
      <h2 id="blocks-title" className="font-serif text-2xl">Story sections</h2>
      <p className="a-help text-sm">Build the story from sections. Reorder with the arrows.</p>
      {blocks.length === 0 ? <p className="mt-6 text-sm text-body/70">No sections yet. Add the first one below.</p> : null}
      <ol className="mt-6 space-y-4">
        {blocks.map((b, i) => (
          <li key={i} className="rounded-sm border border-stone bg-[#fbfaf8] p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{i + 1}. {BLOCK_LABELS[b.type]}</p>
              <div className="flex gap-1">
                <button type="button" className="a-btn min-h-[32px] px-2 py-1 text-xs" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move section ${i + 1} up`}>↑</button>
                <button type="button" className="a-btn min-h-[32px] px-2 py-1 text-xs" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label={`Move section ${i + 1} down`}>↓</button>
                <button type="button" className="a-btn min-h-[32px] px-2 py-1 text-xs text-[#9b2c1f]" onClick={() => window.confirm("Remove this section?") && onChange(blocks.filter((_, j) => j !== i))}>
                  Remove
                </button>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {BLOCK_FIELDS[b.type].map((f) => (
                <FieldInput
                  key={f.name}
                  field={f}
                  value={b.data[f.name]}
                  ctx={ctx}
                  onChange={(v) => onChange(blocks.map((x, j) => (j === i ? { ...x, data: { ...x.data, [f.name]: v } } : x)))}
                />
              ))}
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap items-end gap-2">
        <label className="a-label">
          Section type
          <select className="a-input" value={adding} onChange={(e) => setAdding(e.target.value as BlockType)}>
            {BLOCK_TYPES.map((t) => (
              <option key={t} value={t}>{BLOCK_LABELS[t]}</option>
            ))}
          </select>
        </label>
        <button type="button" className="a-btn" onClick={() => onChange([...blocks, { type: adding, data: {} }])}>
          Add section
        </button>
      </div>
    </section>
  );
}
