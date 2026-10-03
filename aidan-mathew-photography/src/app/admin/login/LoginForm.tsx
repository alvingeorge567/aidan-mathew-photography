"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "../actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});
  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="a-label">
        Email
        <input name="email" type="email" required autoComplete="username" className="a-input" />
      </label>
      <label className="a-label">
        Password
        <input name="password" type="password" required autoComplete="current-password" className="a-input" />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-[#9b2c1f]">{state.error}</p>
      ) : null}
      <button type="submit" className="a-btn-primary w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-xs text-body/60">There is no public sign-up. New administrators are added by the owner (see the admin guide).</p>
    </form>
  );
}
