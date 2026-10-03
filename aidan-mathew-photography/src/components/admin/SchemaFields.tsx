"use client";

import { useId, type ReactNode } from "react";
import type { Field, Schema, Values } from "@/lib/content/schema";
import type { MediaOption, Option } from "@/lib/admin-types";

export type FieldContext = {
  media: MediaOption[];
  dynamicOptions?: Record<string, Option[]>;
};

type Props = {
  schema: Schema;
  values: Values;
  onChange: (values: Values) => void;
  ctx: FieldContext;
};

export function SchemaFields({ schema, values, onChange, ctx }: Props) {
  return (
    <div className="space-y-8">
      {schema.map((section) => (
        <fieldset key={section.title} className="a-card p-5 sm:p-6">
          <legend className="sr-only">{section.title}</legend>
          <h2 className="font-serif text-2xl" aria-hidden="true">{section.title}</h2>
          {section.description ? <p className="a-help mt-1 text-sm">{section.description}</p> : null}
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {section.fields.map((f) => (
              <FieldInput key={f.name} field={f} value={values[f.name]} onChange={(v) => onChange({ ...values, [f.name]: v })} ctx={ctx} />
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

const wide = (f: Field) => f.type === "textarea" || f.type === "list" || f.type === "media";

export function FieldInput({ field, value, onChange, ctx }: { field: Field; value: unknown; onChange: (v: unknown) => void; ctx: FieldContext }) {
  const id = useId();
  const helpId = field.help ? `${id}-help` : undefined;
  const label = (
    <label htmlFor={id} className="a-label">
      {field.label}
      {field.required ? <span className="text-[#9b2c1f]"> *</span> : null}
    </label>
  );
  const help = field.help ? <p id={helpId} className="a-help">{field.help}</p> : null;
  const str = typeof value === "string" ? value : value == null ? "" : String(value);

  let control: ReactNode;
  switch (field.type) {
    case "text":
    case "url":
    case "email":
    case "date":
      control = (
        <input
          id={id}
          type={field.type === "text" ? "text" : field.type}
          className="a-input"
          value={str}
          maxLength={"maxLength" in field ? field.maxLength : undefined}
          placeholder={"placeholder" in field ? field.placeholder : undefined}
          aria-describedby={helpId}
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
    case "textarea":
      control = (
        <textarea id={id} className="a-input leading-relaxed" rows={field.rows ?? 4} value={str} maxLength={field.maxLength} aria-describedby={helpId} onChange={(e) => onChange(e.target.value)} />
      );
      break;
    case "number":
      control = (
        <input id={id} type="number" className="a-input max-w-[12rem]" value={str} min={field.min} max={field.max} aria-describedby={helpId} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} />
      );
      break;
    case "boolean":
      return (
        <div className="md:col-span-2">
          <label className="flex items-start gap-3 text-sm">
            <input id={id} type="checkbox" className="mt-0.5 h-5 w-5 accent-body" checked={value === true} aria-describedby={helpId} onChange={(e) => onChange(e.target.checked)} />
            <span className="font-medium">{field.label}</span>
          </label>
          {help}
        </div>
      );
    case "select": {
      const options = field.dynamic ? ctx.dynamicOptions?.[field.name] ?? [] : field.options;
      control = (
        <select id={id} className="a-input" value={str} aria-describedby={helpId} onChange={(e) => onChange(e.target.value)}>
          {field.dynamic ? <option value="">— None —</option> : null}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
      break;
    }
    case "media":
      control = <MediaPicker id={id} accept={field.accept} value={str} onChange={onChange} options={ctx.media} describedBy={helpId} />;
      break;
    case "list":
      return (
        <div className="md:col-span-2">
          <ListField field={field} value={value} onChange={onChange} ctx={ctx} />
        </div>
      );
  }

  return (
    <div className={wide(field) ? "md:col-span-2" : undefined}>
      {label}
      {help}
      {control}
    </div>
  );
}

function MediaPicker({ id, accept, value, onChange, options, describedBy }: { id: string; accept: "image" | "video" | "any"; value: string; onChange: (v: string) => void; options: MediaOption[]; describedBy?: string }) {
  const filtered = options.filter((o) => accept === "any" || o.type === accept);
  const selected = options.find((o) => o.id === value);
  return (
    <div className="mt-1.5 flex items-start gap-3">
      <div className="h-16 w-24 shrink-0 overflow-hidden rounded-sm border border-stone bg-stone">
        {selected?.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={selected.thumb} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <select id={id} className="a-input mt-0" value={value} aria-describedby={describedBy} onChange={(e) => onChange(e.target.value)}>
          <option value="">— None —</option>
          {filtered.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title}
              {o.type === "video" && o.duration ? ` (${Math.round(o.duration)}s)` : ""}
              {o.published ? "" : " — not published"}
            </option>
          ))}
        </select>
        {value && !selected ? <p className="a-help text-[#9b2c1f]">The selected media is missing or not ready.</p> : null}
        {selected && !selected.published ? (
          <p className="a-help text-[#7a4b0c]">This media isn’t published yet. Publish it in Media before publishing this page.</p>
        ) : null}
        {filtered.length === 0 ? <p className="a-help">No ready {accept === "any" ? "media" : `${accept}s`} yet. Upload in Media.</p> : null}
      </div>
    </div>
  );
}

function ListField({ field, value, onChange, ctx }: { field: Extract<Field, { type: "list" }>; value: unknown; onChange: (v: unknown) => void; ctx: FieldContext }) {
  const items = (Array.isArray(value) ? value : []) as Values[];
  const max = field.maxItems ?? 50;
  const set = (next: Values[]) => onChange(next);
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    set(next);
  };
  return (
    <div>
      <p className="a-label">{field.label}</p>
      {field.help ? <p className="a-help">{field.help}</p> : null}
      <ol className="mt-3 space-y-3">
        {items.map((item, i) => (
          <li key={i} className="rounded-sm border border-stone bg-[#fbfaf8] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">{field.itemLabel} {i + 1}</p>
              <div className="flex gap-1">
                <button type="button" className="a-btn min-h-[32px] px-2 py-1 text-xs" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${field.itemLabel} ${i + 1} up`}>↑</button>
                <button type="button" className="a-btn min-h-[32px] px-2 py-1 text-xs" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`Move ${field.itemLabel} ${i + 1} down`}>↓</button>
                <button
                  type="button"
                  className="a-btn min-h-[32px] px-2 py-1 text-xs text-[#9b2c1f]"
                  onClick={() => window.confirm(`Remove ${field.itemLabel.toLowerCase()} ${i + 1}?`) && set(items.filter((_, j) => j !== i))}
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {field.fields.map((sub) => (
                <FieldInput key={sub.name} field={sub} value={item[sub.name]} onChange={(v) => set(items.map((it, j) => (j === i ? { ...it, [sub.name]: v } : it)))} ctx={ctx} />
              ))}
            </div>
          </li>
        ))}
      </ol>
      {items.length < max ? (
        <button type="button" className="a-btn mt-3" onClick={() => set([...items, {}])}>
          Add {field.itemLabel.toLowerCase()}
        </button>
      ) : null}
    </div>
  );
}
