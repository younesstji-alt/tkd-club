"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrigin } from "@/lib/origin";
import type { ActionState } from "@/lib/types";

const LANG_COOKIE = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" as const };

function safeNext(next: FormDataEntryValue | null): string {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/";
}

export async function signIn(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (/confirm/i.test(error.message)) return { error: "emailNotConfirmed" };
    if (/fetch|network/i.test(error.message)) return { error: "networkError" };
    return { error: "invalidLogin" };
  }
  const { data: profile } = await supabase.from("profiles").select("language").eq("id", data.user.id).maybeSingle();
  if (profile?.language) (await cookies()).set("lang", profile.language, LANG_COOKIE);
  redirect(safeNext(fd.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function registerClub(_: ActionState, fd: FormData): Promise<ActionState> {
  const club_name = String(fd.get("club_name") ?? "").trim();
  const full_name = String(fd.get("full_name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (password.length < 8) return { error: "weakPassword" };
  const supabase = await createClient();
  const { data: exists } = await supabase.rpc("club_exists");
  if (exists) return { error: "clubAlreadyExists" };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { club_name, full_name }, emailRedirectTo: `${await getOrigin()}/auth/callback` },
  });
  if (error) return { error: /registered|exists/i.test(error.message) ? "emailTaken" : "genericError" };
  if (!data.session) return { ok: true, message: "checkEmail" };
  redirect("/dashboard");
}

export async function signUpWithInvite(_: ActionState, fd: FormData): Promise<ActionState> {
  const token = String(fd.get("token") ?? "");
  const full_name = String(fd.get("full_name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (password.length < 8) return { error: "weakPassword" };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { invite_token: token, full_name }, emailRedirectTo: `${await getOrigin()}/auth/callback` },
  });
  if (error) return { error: /registered|exists/i.test(error.message) ? "emailTaken" : "genericError" };
  // Supabase returns a user with no identities when the e-mail is already registered
  if (data.user && data.user.identities?.length === 0) return { error: "emailTaken" };
  if (!data.session) return { ok: true, message: "checkEmail" };
  redirect("/");
}

export async function acceptInvite(_: ActionState, fd: FormData): Promise<ActionState> {
  const token = String(fd.get("token") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error) return { error: "genericError" };
  const res = data as { ok: boolean; error?: string };
  if (!res.ok) {
    const map: Record<string, string> = {
      invalid_invite: "inviteInvalid",
      invite_used: "inviteUsed",
      invite_expired: "inviteExpired",
      invite_wrong_email: "inviteWrongEmail",
      already_member: "alreadyMember",
    };
    return { error: map[res.error ?? ""] ?? "genericError" };
  }
  redirect("/");
}

export async function setLanguage(fd: FormData) {
  const lang = fd.get("lang") === "fr" ? "fr" : "ar";
  (await cookies()).set("lang", lang, LANG_COOKIE);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await supabase.from("profiles").update({ language: lang }).eq("id", user.id);
  const back = safeNext(fd.get("back"));
  redirect(back);
}
