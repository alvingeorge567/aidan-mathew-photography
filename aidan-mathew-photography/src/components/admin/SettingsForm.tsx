"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { Schema, Values } from "@/lib/content/schema";
import type { ActionResult } from "@/lib/admin-types";
import { saveSettings } from "@/app/admin/actions/content";
import { SchemaFields, type FieldContext } from "./SchemaFields";

export function SettingsForm({ schema, initial, ctx }: { schema: Schema; initial: Values; ctx: FieldContext }) {
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const dirty = useMemo(() => JSON.stringify(values) !== saved, [values, saved]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return (
    <div className="pb-24">
      <SchemaFields schema={schema} values={values} onChange={setValues} ctx={ctx} />
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone bg-white/95 backdrop-blur lg:left-[240px]">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-8 lg:px-10">
          <button
            type="button"
            className="a-btn-primary"
            disabled={pending || !dirty}
            onClick={() =>
              start(async () => {
                const r = await saveSettings(values);
                setResult(r);
                if (r.ok) setSaved(JSON.stringify(values));
              })
            }
          >
            {pending ? "Saving…" : dirty ? "Save settings" : "Saved"}
          </button>
          <p role="status" aria-live="polite" className={`text-sm ${result && !result.ok ? "text-[#9b2c1f]" : "text-body/75"}`}>
            {dirty ? "Unsaved changes — settings apply to the live site as soon as you save." : result ? (result.ok ? result.message : result.error) : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
