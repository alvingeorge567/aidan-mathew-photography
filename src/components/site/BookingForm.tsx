"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { checkDateAvailability, submitBooking } from "@/app/actions/public";
import { initialFormState } from "@/lib/forms";
import { BOOKING_FIELD_STEP } from "@/lib/validation";
import { BOOKING_REQUEST_NOTICE, availabilityMessage, type DateAvailability } from "@shared/booking-rules";
import { FormField, inputClass, useSubmissionGuard } from "./FormBits";

type Props = {
  eventTypes: string[];
  services: { slug: string; title: string }[];
  budgetRanges: string[];
  referralSources: string[];
  preselectedService?: string;
};

const STEPS = ["Event details", "Contact details", "A little more"];

export function BookingForm({ eventTypes, services, budgetRanges, referralSources, preselectedService }: Props) {
  const [state, action, pending] = useActionState(submitBooking, initialFormState);
  const guard = useSubmissionGuard();
  const [step, setStep] = useState(0);
  const [availability, setAvailability] = useState<DateAvailability | null>(null);
  const [checking, setChecking] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const fe = state.fieldErrors ?? {};
  const minDate = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (state.status === "error") {
      const first = Object.keys(state.fieldErrors ?? {})[0];
      if (first && BOOKING_FIELD_STEP[first] !== undefined) setStep(BOOKING_FIELD_STEP[first]);
      statusRef.current?.focus();
    }
    if (state.status === "success") statusRef.current?.focus();
  }, [state]);

  const stepFieldset = (i: number) => formRef.current?.querySelector<HTMLFieldSetElement>(`fieldset[data-step="${i}"]`);

  const validateStep = (i: number) => {
    const fs = stepFieldset(i);
    if (!fs) return true;
    const controls = Array.from(fs.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea"));
    for (const c of controls) {
      if (!c.checkValidity()) {
        c.reportValidity();
        return false;
      }
    }
    return true;
  };

  const goTo = (i: number) => {
    setStep(i);
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const next = () => {
    if (validateStep(step)) goTo(step + 1);
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    for (let i = 0; i < STEPS.length; i++) {
      if (i !== step) {
        // Hidden steps can't show native messages; jump to the first incomplete one.
        const fs = stepFieldset(i);
        const invalid = fs && Array.from(fs.querySelectorAll<HTMLInputElement>("input, select, textarea")).some((c) => !c.checkValidity());
        if (invalid) {
          setStep(i);
          requestAnimationFrame(() => validateStep(i));
          return;
        }
      } else if (!validateStep(i)) return;
    }
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };

  const onDateChange = async (value: string) => {
    setAvailability(null);
    if (!value) return;
    setChecking(true);
    try {
      setAvailability(await checkDateAvailability(value));
    } catch {
      setAvailability("unknown");
    } finally {
      setChecking(false);
    }
  };

  if (state.status === "success") {
    return (
      <div ref={statusRef} tabIndex={-1} role="status" className="border border-stone bg-white/40 p-8 sm:p-12">
        <h2 className="font-serif text-4xl">Your request has been received.</h2>
        <p className="mt-4 text-lg">
          Reference number: <strong className="tracking-wider">{state.reference}</strong>
        </p>
        <p className="mt-4 max-w-prose">
          This is a request, not a confirmed booking. We will review your date and reply personally. Your booking is confirmed only after the studio accepts it.
        </p>
        <p className="mt-4 max-w-prose text-sm text-body/75">
          If email is set up for the studio, you will also receive an acknowledgment with this reference. Please keep it for any follow-up.
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="relative">
      {guard.fields}

      <p className="mb-8 border-l-2 border-champagne bg-white/40 px-4 py-3 text-sm">{BOOKING_REQUEST_NOTICE}</p>

      <ol className="mb-10 grid grid-cols-3 gap-2 text-xs sm:text-sm" aria-label="Form progress">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === step ? "step" : undefined} className={`border-t-2 pt-3 ${i <= step ? "border-body text-body" : "border-stone text-body/55"}`}>
            <span className="sr-only">Step {i + 1} of {STEPS.length}: </span>
            {label}
          </li>
        ))}
      </ol>

      {state.status === "error" ? (
        <div ref={statusRef} tabIndex={-1} role="alert" className="mb-8 border-l-2 border-[#9b2c1f] bg-[#9b2c1f]/5 px-4 py-3 text-sm">
          {state.message}
        </div>
      ) : null}

      <h2 ref={headingRef} tabIndex={-1} className="mb-6 font-serif text-3xl outline-none">
        {STEPS[step]}
      </h2>

      <fieldset data-step="0" hidden={step !== 0} className="space-y-6">
        <legend className="sr-only">{STEPS[0]}</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField id="bk-type" label="Type of event" error={fe.event_type}>
            {(d) => (
              <select id="bk-type" name="event_type" required className={inputClass(fe.event_type)} aria-describedby={d} defaultValue="">
                <option value="" disabled>Choose one</option>
                {eventTypes.map((t) => <option key={t}>{t}</option>)}
              </select>
            )}
          </FormField>
          <FormField id="bk-date" label="Preferred date" error={fe.event_date}>
            {(d) => (
              <input id="bk-date" name="event_date" type="date" required min={minDate} className={inputClass(fe.event_date)} aria-describedby={`${d ?? ""} bk-date-availability`.trim()} onChange={(e) => onDateChange(e.target.value)} />
            )}
          </FormField>
        </div>
        <p id="bk-date-availability" aria-live="polite" className="min-h-[1.25rem] text-sm text-body/80">
          {checking ? "Checking the calendar…" : availability ? availabilityMessage(availability) : ""}
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField id="bk-venue" label="Venue" optional hint="If you know it yet." error={fe.venue}>
            {(d) => <input id="bk-venue" name="venue" className={inputClass(fe.venue)} aria-describedby={d} />}
          </FormField>
          <FormField id="bk-city" label="City or area" error={fe.city}>
            {(d) => <input id="bk-city" name="city" required autoComplete="address-level2" className={inputClass(fe.city)} aria-describedby={d} />}
          </FormField>
        </div>
        <FormField id="bk-service" label="Service you're interested in" error={fe.service_slug}>
          {(d) => (
            <select id="bk-service" name="service_slug" className={inputClass(fe.service_slug)} aria-describedby={d} defaultValue={services.some((s) => s.slug === preselectedService) ? preselectedService : ""}>
              <option value="">Not sure yet</option>
              {services.map((s) => <option key={s.slug} value={s.slug}>{s.title}</option>)}
            </select>
          )}
        </FormField>
        <FormField id="bk-coverage" label="Coverage you have in mind" optional hint="Hours, parts of the day, travel — anything you already know." error={fe.coverage_notes}>
          {(d) => <textarea id="bk-coverage" name="coverage_notes" rows={3} className={inputClass(fe.coverage_notes)} aria-describedby={d} />}
        </FormField>
      </fieldset>

      <fieldset data-step="1" hidden={step !== 1} className="space-y-6">
        <legend className="sr-only">{STEPS[1]}</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField id="bk-name" label="Your name" error={fe.name}>
            {(d) => <input id="bk-name" name="name" required autoComplete="name" className={inputClass(fe.name)} aria-describedby={d} />}
          </FormField>
          <FormField id="bk-partner" label="Partner's name" optional error={fe.partner_name}>
            {(d) => <input id="bk-partner" name="partner_name" className={inputClass(fe.partner_name)} aria-describedby={d} />}
          </FormField>
          <FormField id="bk-email" label="Email" error={fe.email}>
            {(d) => <input id="bk-email" name="email" type="email" required autoComplete="email" className={inputClass(fe.email)} aria-describedby={d} />}
          </FormField>
          <FormField id="bk-phone" label="Phone" optional error={fe.phone}>
            {(d) => <input id="bk-phone" name="phone" type="tel" autoComplete="tel" className={inputClass(fe.phone)} aria-describedby={d} />}
          </FormField>
        </div>
        <fieldset>
          <legend className="text-sm font-medium">How should we contact you?</legend>
          <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
            {[["email", "Email"], ["phone", "Phone"], ["either", "Either"]].map(([v, l]) => (
              <label key={v} className="flex min-h-[44px] items-center gap-3">
                <input type="radio" name="preferred_contact" value={v} defaultChecked={v === "email"} className="h-4 w-4 accent-body" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        {budgetRanges.length ? (
          <FormField id="bk-budget" label="Budget range" optional error={fe.budget_range}>
            {(d) => (
              <select id="bk-budget" name="budget_range" className={inputClass(fe.budget_range)} aria-describedby={d} defaultValue="">
                <option value="">Prefer not to say</option>
                {budgetRanges.map((b) => <option key={b}>{b}</option>)}
              </select>
            )}
          </FormField>
        ) : null}
      </fieldset>

      <fieldset data-step="2" hidden={step !== 2} className="space-y-6">
        <legend className="sr-only">{STEPS[2]}</legend>
        <FormField id="bk-message" label="Tell us about your plans" optional hint="The people, the place, what matters most to you." error={fe.message}>
          {(d) => <textarea id="bk-message" name="message" rows={6} className={inputClass(fe.message)} aria-describedby={d} />}
        </FormField>
        <FormField id="bk-referral" label="How did you hear about us?" optional error={fe.referral_source}>
          {(d) => (
            <select id="bk-referral" name="referral_source" className={inputClass(fe.referral_source)} aria-describedby={d} defaultValue="">
              <option value="">Choose one</option>
              {referralSources.map((r) => <option key={r}>{r}</option>)}
            </select>
          )}
        </FormField>
        <div>
          <label className="flex items-start gap-3">
            <input type="checkbox" name="privacy_ack" required className="mt-1 h-5 w-5 shrink-0 accent-body" aria-invalid={!!fe.privacy_ack} aria-describedby={fe.privacy_ack ? "bk-privacy-error" : undefined} />
            <span className="text-sm">
              I have read the <a href="/privacy" target="_blank" className="underline underline-offset-2">privacy notice</a> and agree to the studio using these details to reply to my request.
            </span>
          </label>
          {fe.privacy_ack ? <p id="bk-privacy-error" role="alert" className="mt-2 text-sm text-[#9b2c1f]">{fe.privacy_ack}</p> : null}
        </div>
      </fieldset>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        {step > 0 ? (
          <button type="button" className="btn btn-ghost-dark" onClick={() => goTo(step - 1)}>
            Back
          </button>
        ) : null}
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn btn-dark" onClick={next}>
            Continue
          </button>
        ) : (
          <button type="submit" className="btn btn-dark" disabled={pending || !guard.ready}>
            {pending ? "Sending request…" : "Request availability"}
          </button>
        )}
        <span className="text-sm text-body/70">Step {step + 1} of {STEPS.length}</span>
      </div>
    </form>
  );
}
