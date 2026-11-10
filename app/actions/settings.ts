"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { errorKey } from "@/lib/errors";
import type { ActionState, Role } from "@/lib/types";

const clampInt = (v: FormDataEntryValue | null, min: number, max: number, dflt: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : dflt;
};

export async function saveClub(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { error: "genericError" };
  const { error } = await supabase
    .from("clubs")
    .update({
      name,
      default_language: fd.get("default_language") === "fr" ? "fr" : "ar",
      checkin_opens_before_min: clampInt(fd.get("checkin_opens_before_min"), 0, 720, 30),
      checkin_closes_after_min: clampInt(fd.get("checkin_closes_after_min"), 0, 720, 45),
      late_after_min: clampInt(fd.get("late_after_min"), 0, 720, 10),
    })
    .eq("id", String(fd.get("id")));
  if (error) return { error: errorKey(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: "saved" };
}

export async function addTrainingType(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const name_ar = String(fd.get("name_ar") ?? "").trim();
  const name_fr = String(fd.get("name_fr") ?? "").trim() || name_ar;
  const color = String(fd.get("color") ?? "#2563eb");
  if (!name_ar) return { error: "genericError" };
  const { error } = await supabase.from("training_types").insert({ name_ar, name_fr, color, sort_order: 100 });
  if (error) return { error: errorKey(error) };
  revalidatePath("/settings");
  return { ok: true, message: "saved" };
}

export async function updateTrainingType(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("training_types")
    .update({
      name_ar: String(fd.get("name_ar") ?? "").trim(),
      name_fr: String(fd.get("name_fr") ?? "").trim(),
      color: String(fd.get("color") ?? "#2563eb"),
      active: fd.get("active") !== null,
    })
    .eq("id", String(fd.get("id")));
  if (error) return { error: errorKey(error) };
  revalidatePath("/settings");
  return { ok: true, message: "saved" };
}

export async function setMember(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_member", {
    p_profile: String(fd.get("id")),
    p_role: String(fd.get("role")) as Role,
    p_active: fd.get("active") !== null,
  });
  if (error) return { error: errorKey(error) };
  revalidatePath("/settings/members");
  return { ok: true, message: "memberUpdated" };
}
