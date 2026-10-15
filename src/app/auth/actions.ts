"use server";

import { redirect } from "next/navigation";
import { safeNext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function field(formData: FormData, name: string) {
  const v = formData.get(name);
  return typeof v === "string" ? v.trim() : "";
}

function fail(path: "/login" | "/signup", message: string, next: string): never {
  const q = new URLSearchParams({ error: message, next });
  redirect(`${path}?${q.toString()}`);
}

export async function login(formData: FormData) {
  const email = field(formData, "email");
  const password = field(formData, "password");
  const next = safeNext(formData.get("next"));
  if (!email || !password) fail("/login", "Enter your email and password.", next);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) fail("/login", error.message, next);

  redirect(next);
}

export async function signup(formData: FormData) {
  const email = field(formData, "email");
  const password = field(formData, "password");
  const next = safeNext(formData.get("next"));
  if (!email || password.length < 6) {
    fail("/signup", "Enter an email and a password of at least 6 characters.", next);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) fail("/signup", error.message, next);

  // With "Confirm email" enabled there is no session until the link is clicked.
  if (!data.session) redirect("/signup?check-email=1");

  redirect(next);
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
