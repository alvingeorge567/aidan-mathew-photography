import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-4 text-body">
      <div className="w-full max-w-sm bg-ivory p-8">
        <h1 className="font-serif text-3xl">Studio admin</h1>
        <p className="mt-2 text-sm text-body/70">Sign in with your administrator account.</p>
        {!isSupabaseConfigured() ? (
          <p role="alert" className="mt-6 border-l-2 border-[#9b2c1f] bg-[#9b2c1f]/5 px-3 py-2 text-sm">
            Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see README).
          </p>
        ) : null}
        <LoginForm />
      </div>
    </main>
  );
}
