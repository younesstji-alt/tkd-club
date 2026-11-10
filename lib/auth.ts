import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Club, Profile } from "./types";

export const getCurrent = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null, club: null } as const;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>();
  let club: Club | null = null;
  if (profile?.active) {
    const { data } = await supabase.from("clubs").select("*").eq("id", profile.club_id).maybeSingle<Club>();
    club = data;
  }
  return { supabase, user, profile: profile?.active ? profile : null, club } as const;
});

export async function requireMember() {
  const ctx = await getCurrent();
  if (!ctx.user) redirect("/login");
  if (!ctx.profile || !ctx.club) redirect("/no-access");
  return { ...ctx, user: ctx.user, profile: ctx.profile, club: ctx.club };
}

export async function requireStaff() {
  const ctx = await requireMember();
  if (ctx.profile.role === "athlete") redirect("/me");
  return ctx;
}

export async function requireAdmin() {
  const ctx = await requireMember();
  if (ctx.profile.role !== "admin") redirect("/dashboard");
  return ctx;
}

export async function requireAthlete() {
  const ctx = await requireMember();
  if (ctx.profile.role !== "athlete") redirect("/dashboard");
  const { data: athlete } = await ctx.supabase.from("athletes").select("*").eq("profile_id", ctx.user.id).maybeSingle();
  if (!athlete) redirect("/no-access");
  return { ...ctx, athlete };
}

