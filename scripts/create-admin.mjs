#!/usr/bin/env node
/**
 * Creates the first administrator (or adds another). Run on a trusted machine:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run admin:create
 * Prompts for an email, display name and password (input hidden). Nothing is hardcoded,
 * and the password is never stored by this script. If the email already belongs to a
 * Supabase user, that user is granted admin access instead.
 */
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY first.");
  process.exit(1);
}

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => {
        if (s.includes(question)) rl.output.write(s);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const email = (await ask("Admin email: ")).toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("That doesn't look like an email address.");
  process.exit(1);
}
const name = (await ask("Display name: ")) || email;

let userId = null;
for (let page = 1; page <= 20 && !userId; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
  if (data.users.length < 200) break;
}

if (userId) {
  console.log("An account with this email exists; granting admin access to it.");
} else {
  const password = await ask("Password (min 12 characters, hidden): ", { hidden: true });
  const confirm = await ask("Repeat password: ", { hidden: true });
  if (password.length < 12) {
    console.error("Use at least 12 characters.");
    process.exit(1);
  }
  if (password !== confirm) {
    console.error("Passwords don't match.");
    process.exit(1);
  }
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    console.error(`Could not create the user: ${error.message}`);
    process.exit(1);
  }
  userId = data.user.id;
}

const { error } = await db.from("admin_profiles").upsert({ user_id: userId, display_name: name, active: true });
if (error) {
  console.error(`Could not grant admin access: ${error.message}`);
  process.exit(1);
}
await db.from("audit_logs").insert({ action: "admin.granted", entity_type: "admin", entity_id: userId, details: { email, via: "create-admin script" } });
console.log(`Done. ${email} can now sign in at /admin/login.`);
