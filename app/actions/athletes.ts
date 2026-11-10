"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { errorKey } from "@/lib/errors";
import { todayISO } from "@/lib/time";
import { getOrigin } from "@/lib/origin";
import type { ActionState } from "@/lib/types";

function str(fd: FormData, k: string) {
  const v = String(fd.get(k) ?? "").trim();
  return v === "" ? null : v;
}
function num(fd: FormData, k: string) {
  const v = str(fd, k);
  if (v === null) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

async function uploadPhoto(supabase: Awaited<ReturnType<typeof createClient>>, clubId: string, athleteId: string, file: File) {
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${clubId}/${athleteId}.${ext}`;
  const { error } = await supabase.storage.from("athlete-photos").upload(path, file, { upsert: true, contentType: file.type });
  if (error) return null;
  return path;
}

export async function saveAthlete(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const id = str(fd, "id");
  const full_name = str(fd, "full_name");
  if (!full_name) return { error: "genericError" };
  const weight_kg = num(fd, "weight_kg");
  const weekly = num(fd, "weekly_target");

  const base = {
    full_name,
    belt: str(fd, "belt"),
    weight_category: str(fd, "weight_category"),
    weekly_target: weekly ? Math.round(weekly) : null,
    date_of_birth: str(fd, "date_of_birth"),
    joined_on: str(fd, "joined_on") ?? todayISO(),
    active: fd.get("active") !== null || !id,
  };

  let athleteId = id;
  let clubId: string;
  if (id) {
    const { data: existing, error: e0 } = await supabase.from("athletes").select("club_id,weight_kg").eq("id", id).single();
    if (e0 || !existing) return { error: errorKey(e0) };
    clubId = existing.club_id;
    const weightChanged = Number(existing.weight_kg ?? NaN) !== Number(weight_kg ?? NaN);
    const { error } = await supabase
      .from("athletes")
      .update({ ...base, weight_kg, ...(weightChanged ? { weight_updated_on: weight_kg === null ? null : todayISO() } : {}) })
      .eq("id", id);
    if (error) return { error: errorKey(error) };
  } else {
    const { data, error } = await supabase
      .from("athletes")
      .insert({ ...base, weight_kg, weight_updated_on: weight_kg === null ? null : todayISO() })
      .select("id,club_id")
      .single();
    if (error) return { error: errorKey(error) };
    athleteId = data.id;
    clubId = data.club_id;
  }

  // training types
  const types = fd.getAll("types").map(String);
  await supabase.from("athlete_training_types").delete().eq("athlete_id", athleteId!);
  if (types.length) {
    const { error } = await supabase
      .from("athlete_training_types")
      .insert(types.map((tt) => ({ athlete_id: athleteId, training_type_id: tt })));
    if (error) return { error: errorKey(error) };
  }

  // photo
  const photo = fd.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > 3 * 1024 * 1024 || !/^image\/(jpeg|png|webp)$/.test(photo.type)) return { error: "genericError" };
    const path = await uploadPhoto(supabase, clubId, athleteId!, photo);
    if (path) await supabase.from("athletes").update({ photo_path: path }).eq("id", athleteId!);
  } else if (fd.get("remove_photo")) {
    await supabase.from("athletes").update({ photo_path: null }).eq("id", athleteId!);
  }

  revalidatePath("/athletes");
  // client-side navigation (a server redirect is unreliable for multipart/file submissions)
  return { ok: true, data: { redirect: `/athletes/${athleteId}` } };
}

/** Create an invitation (athlete, coach or admin) and return the link. */
export async function createInvite(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const email = str(fd, "email");
  const role = (str(fd, "role") ?? "athlete") as "admin" | "coach" | "athlete";
  if (!email) return { error: "genericError" };
  const { data, error } = await supabase
    .from("invitations")
    .insert({ email: email.toLowerCase(), role, full_name: str(fd, "full_name"), athlete_id: str(fd, "athlete_id") })
    .select("token")
    .single();
  if (error) return { error: errorKey(error) };
  revalidatePath("/settings/members");
  return { ok: true, message: "inviteCreated", data: { link: `${await getOrigin()}/invite/${data.token}` } };
}

export async function deleteInvite(fd: FormData) {
  const supabase = await createClient();
  await supabase.from("invitations").delete().eq("id", String(fd.get("id")));
  revalidatePath("/settings/members");
}
