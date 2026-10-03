"use server";

import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export type LoginState = { error?: string };

export async function signIn(_prev: LoginState, fd: FormData): Promise<LoginState> {
  if (!isSupabaseConfigured()) return { error: "Supabase isn't configured. Add the environment variables in .env.local (see README)." };
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  const db = await createSessionClient();
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "That email and password don't match an account." };
  const { data: profile } = await db.from("admin_profiles").select("active").eq("user_id", data.user.id).maybeSingle();
  if (!profile?.active) {
    await db.auth.signOut();
    return { error: "This account doesn't have admin access." };
  }
  redirect("/admin");
}

export async function signOut() {
  const db = await createSessionClient();
  await db.auth.signOut();
  redirect("/admin/login");
}
