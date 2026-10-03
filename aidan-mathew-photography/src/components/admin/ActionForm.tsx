"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import type { ActionResult } from "@/lib/admin-types";

type Props = {
  action: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
  children: ReactNode | ((pending: boolean) => ReactNode);
  /** Asks for confirmation before destructive actions. */
  confirm?: string;
  className?: string;
  resetOnSuccess?: boolean;
};

export function ActionForm({ action, children, confirm, className, resetOnSuccess }: Props) {
  const [state, dispatch, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (confirm && !window.confirm(confirm)) return;
    const form = e.currentTarget;
    const fd = new FormData(form, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => dispatch(fd));
  };

  return (
    <form ref={formRef} onSubmit={onSubmit} className={className}>
      {typeof children === "function" ? children(pending) : children}
      {state ? (
        <p role={state.ok ? "status" : "alert"} className={`mt-2 text-sm ${state.ok ? "text-[#2f6b3a]" : "text-[#9b2c1f]"}`}>
          {state.ok ? state.message : state.error}
        </p>
      ) : null}
    </form>
  );
}
