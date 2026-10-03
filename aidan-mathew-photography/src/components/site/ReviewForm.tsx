"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";
import { submitReview } from "@/app/actions/public";
import { initialFormState } from "@/lib/forms";
import { FormField, inputClass, useSubmissionGuard } from "./FormBits";

export function ReviewForm() {
  const [state, action, pending] = useActionState(submitReview, initialFormState);
  const guard = useSubmissionGuard();
  const statusRef = useRef<HTMLDivElement>(null);
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.status !== "idle") statusRef.current?.focus();
  }, [state]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };

  if (state.status === "success") {
    return (
      <div ref={statusRef} tabIndex={-1} role="status" className="border border-stone p-8">
        <h3 className="font-serif text-3xl">Thank you for your words.</h3>
        <p className="mt-3">Your review has been received. The studio reads every review before it appears on the site.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative space-y-6">
      {guard.fields}
      {state.status === "error" ? (
        <div ref={statusRef} tabIndex={-1} role="alert" className="border-l-2 border-[#9b2c1f] bg-[#9b2c1f]/5 px-4 py-3 text-sm">
          {state.message}
        </div>
      ) : null}
      <div className="grid gap-6 sm:grid-cols-2">
        <FormField id="rv-name" label="Name to show with your review" hint="For example “Maya & Sam”." error={fe.display_name}>
          {(d) => <input id="rv-name" name="display_name" required className={inputClass(fe.display_name)} aria-describedby={d} />}
        </FormField>
        <FormField id="rv-email" label="Email" optional hint="Never published. Only used if we need to check something with you." error={fe.submitter_email}>
          {(d) => <input id="rv-email" name="submitter_email" type="email" autoComplete="email" className={inputClass(fe.submitter_email)} aria-describedby={d} />}
        </FormField>
      </div>
      <FormField id="rv-text" label="Your review" error={fe.review_text}>
        {(d) => <textarea id="rv-text" name="review_text" required minLength={10} rows={6} className={inputClass(fe.review_text)} aria-describedby={d} />}
      </FormField>
      <div className="grid gap-6 sm:grid-cols-2">
        <FormField id="rv-rating" label="Rating" optional error={fe.rating}>
          {(d) => (
            <select id="rv-rating" name="rating" className={inputClass(fe.rating)} aria-describedby={d} defaultValue="">
              <option value="">No rating</option>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} out of 5</option>)}
            </select>
          )}
        </FormField>
        <FormField id="rv-event" label="Type of event" optional error={fe.event_type}>
          {(d) => <input id="rv-event" name="event_type" className={inputClass(fe.event_type)} aria-describedby={d} placeholder="Wedding" />}
        </FormField>
      </div>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="publication_permission" required className="mt-1 h-5 w-5 shrink-0 accent-body" />
        <span className="text-sm">I give permission for this review and the name above to be published on this website. Your words will be published as written.</span>
      </label>
      {fe.publication_permission ? <p role="alert" className="text-sm text-[#9b2c1f]">{fe.publication_permission}</p> : null}
      <button type="submit" className="btn btn-dark" disabled={pending || !guard.ready}>
        {pending ? "Sending…" : "Send review"}
      </button>
    </form>
  );
}
