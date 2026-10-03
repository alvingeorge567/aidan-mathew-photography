"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";
import { submitInquiry } from "@/app/actions/public";
import { initialFormState } from "@/lib/forms";
import { FormField, inputClass, useSubmissionGuard } from "./FormBits";

type Props = { inquiryTypes: string[]; compact?: boolean };

export function InquiryForm({ inquiryTypes, compact }: Props) {
  const [state, action, pending] = useActionState(submitInquiry, initialFormState);
  const guard = useSubmissionGuard();
  const statusRef = useRef<HTMLDivElement>(null);
  const fe = state.fieldErrors ?? {};

  // Submitting manually (rather than <form action>) keeps the visitor's input if validation fails.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };

  useEffect(() => {
    if (state.status !== "idle") statusRef.current?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <div ref={statusRef} tabIndex={-1} className="border border-stone bg-ivory/60 p-8" role="status">
        <h3 className="font-serif text-3xl">Thank you — your message is with us.</h3>
        <p className="mt-3">
          Your reference is <strong className="tracking-wide">{state.reference}</strong>. We reply personally, usually within a few days.
        </p>
      </div>
    );
  }

  const types = inquiryTypes.length ? inquiryTypes : ["General question"];
  const p = compact ? "inq-c" : "inq";

  return (
    <form onSubmit={onSubmit} className="relative space-y-5" aria-describedby={state.status === "error" ? `${p}-status` : undefined}>
      {guard.fields}
      {state.status === "error" ? (
        <div ref={statusRef} tabIndex={-1} id={`${p}-status`} role="alert" className="border-l-2 border-[#9b2c1f] bg-[#9b2c1f]/5 px-4 py-3 text-sm">
          {state.message}
        </div>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id={`${p}-name`} label="Your name" error={fe.name}>
          {(d) => <input id={`${p}-name`} name="name" required autoComplete="name" className={inputClass(fe.name)} aria-describedby={d} aria-invalid={!!fe.name} />}
        </FormField>
        <FormField id={`${p}-email`} label="Email" error={fe.email}>
          {(d) => <input id={`${p}-email`} name="email" type="email" required autoComplete="email" className={inputClass(fe.email)} aria-describedby={d} aria-invalid={!!fe.email} />}
        </FormField>
      </div>
      <FormField id={`${p}-type`} label="What is this about?" error={fe.inquiry_type}>
        {(d) => (
          <select id={`${p}-type`} name="inquiry_type" className={inputClass(fe.inquiry_type)} aria-describedby={d} defaultValue={types[0]}>
            {types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        )}
      </FormField>
      {!compact ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id={`${p}-phone`} label="Phone" optional error={fe.phone}>
            {(d) => <input id={`${p}-phone`} name="phone" type="tel" autoComplete="tel" className={inputClass(fe.phone)} aria-describedby={d} aria-invalid={!!fe.phone} />}
          </FormField>
          <FormField id={`${p}-date`} label="Event date" optional error={fe.event_date}>
            {(d) => <input id={`${p}-date`} name="event_date" type="date" className={inputClass(fe.event_date)} aria-describedby={d} aria-invalid={!!fe.event_date} />}
          </FormField>
        </div>
      ) : null}
      <FormField id={`${p}-message`} label="Message" error={fe.message}>
        {(d) => <textarea id={`${p}-message`} name="message" required minLength={10} rows={compact ? 4 : 6} className={inputClass(fe.message)} aria-describedby={d} aria-invalid={!!fe.message} />}
      </FormField>
      <p className="text-xs text-body/70">
        We use your details only to reply to you. See our <a href="/privacy" className="underline underline-offset-2">privacy notice</a>.
      </p>
      <button type="submit" className="btn btn-dark" disabled={pending || !guard.ready} aria-disabled={pending}>
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
