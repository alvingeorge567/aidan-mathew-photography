"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Hidden fields used for duplicate prevention and spam checks. Set after mount to avoid hydration mismatch. */
export function useSubmissionGuard() {
  const [key, setKey] = useState("");
  const [startedAt, setStartedAt] = useState("");
  useEffect(() => {
    setKey(crypto.randomUUID());
    setStartedAt(String(Date.now()));
  }, []);
  const reset = () => {
    setKey(crypto.randomUUID());
    setStartedAt(String(Date.now()));
  };
  const fields = (
    <>
      <input type="hidden" name="idempotency_key" value={key} />
      <input type="hidden" name="started_at" value={startedAt} />
      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label>
          Leave this field empty
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
    </>
  );
  return { fields, reset, ready: Boolean(key) };
}

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: (describedBy: string | undefined) => ReactNode;
  tone?: "light" | "dark";
};

export function FormField({ id, label, error, hint, optional, children, tone = "light" }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className={`block text-sm font-medium ${tone === "dark" ? "text-ivory" : "text-body"}`}>
        {label}
        {optional ? <span className={`font-normal ${tone === "dark" ? "text-ivory/60" : "text-bronze"}`}> (optional)</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className={`mt-1 text-xs ${tone === "dark" ? "text-ivory/60" : "text-body/70"}`}>
          {hint}
        </p>
      ) : null}
      <div className="mt-2">{children(describedBy)}</div>
      {error ? (
        <p id={errId} className="mt-2 text-sm text-[#9b2c1f]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function inputClass(error?: string) {
  return `field ${error ? "border-[#9b2c1f]" : ""}`;
}
