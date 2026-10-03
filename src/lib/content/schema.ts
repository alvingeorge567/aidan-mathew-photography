/**
 * A small schema system that drives both the admin editors and server-side sanitising.
 * The server never stores fields that are not declared here.
 */
export type FieldBase = { name: string; label: string; help?: string; required?: boolean };

export type Field =
  | (FieldBase & { type: "text" | "textarea" | "url" | "email" | "date"; maxLength?: number; rows?: number; placeholder?: string })
  | (FieldBase & { type: "number"; min?: number; max?: number })
  | (FieldBase & { type: "boolean" })
  | (FieldBase & { type: "select"; options: { value: string; label: string }[]; dynamic?: boolean })
  | (FieldBase & { type: "media"; accept: "image" | "video" | "any" })
  | (FieldBase & { type: "list"; itemLabel: string; fields: Field[]; maxItems?: number });

export type Section = { title: string; description?: string; fields: Field[] };
export type Schema = Section[];
export type Values = Record<string, unknown>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function allFields(schema: Schema): Field[] {
  return schema.flatMap((s) => s.fields);
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

export function sanitizeValue(field: Field, raw: unknown): unknown {
  switch (field.type) {
    case "text":
    case "textarea": {
      const max = field.maxLength ?? (field.type === "text" ? 300 : 20000);
      return str(raw).replace(/\r\n/g, "\n").slice(0, max).trim();
    }
    case "url": {
      const v = str(raw).trim().slice(0, 2000);
      if (!v) return "";
      if (v.startsWith("/") && !v.startsWith("//")) return v;
      try {
        const u = new URL(v);
        return u.protocol === "https:" || u.protocol === "http:" || u.protocol === "mailto:" ? u.toString() : "";
      } catch {
        return "";
      }
    }
    case "email": {
      const v = str(raw).trim().slice(0, 254);
      return EMAIL.test(v) ? v : "";
    }
    case "date": {
      const v = str(raw).trim();
      return DATE.test(v) ? v : "";
    }
    case "number": {
      if (raw === "" || raw == null) return null;
      let n = Number(raw);
      if (!Number.isFinite(n)) return null;
      if (field.min !== undefined) n = Math.max(field.min, n);
      if (field.max !== undefined) n = Math.min(field.max, n);
      return n;
    }
    case "boolean":
      return raw === true || raw === "true" || raw === "on";
    case "select": {
      const v = str(raw);
      if (field.dynamic) return v.slice(0, 200);
      return field.options.some((o) => o.value === v) ? v : (field.options[0]?.value ?? "");
    }
    case "media": {
      const v = str(raw);
      return UUID.test(v) ? v : "";
    }
    case "list": {
      const arr = Array.isArray(raw) ? raw : [];
      return arr.slice(0, field.maxItems ?? 50).map((item) => sanitizeObject(field.fields, (item ?? {}) as Values));
    }
  }
}

export function sanitizeObject(fields: Field[], data: Values): Values {
  const out: Values = {};
  for (const f of fields) out[f.name] = sanitizeValue(f, data[f.name]);
  return out;
}

export function sanitizeBySchema(schema: Schema, data: Values): Values {
  return sanitizeObject(allFields(schema), data ?? {});
}

/** Labels of required fields that are empty. Checked before publishing. */
export function missingRequired(schema: Schema, data: Values): string[] {
  return allFields(schema)
    .filter((f) => f.required)
    .filter((f) => {
      const v = data[f.name];
      return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
    })
    .map((f) => f.label);
}

export function collectMediaIdsFromFields(fields: Field[], data: Values, out: Set<string> = new Set()): Set<string> {
  for (const f of fields) {
    const v = data?.[f.name];
    if (f.type === "media" && typeof v === "string" && UUID.test(v)) out.add(v);
    if (f.type === "list" && Array.isArray(v)) v.forEach((item) => collectMediaIdsFromFields(f.fields, item as Values, out));
  }
  return out;
}

export function collectMediaIds(schema: Schema, data: Values): string[] {
  return [...collectMediaIdsFromFields(allFields(schema), data)];
}

/** Placeholder text is wrapped in square brackets so it is easy to find before launch. */
export function isPlaceholder(v: unknown): boolean {
  return typeof v === "string" && /^\[.*\]$/s.test(v.trim());
}
