"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { errorKey } from "@/lib/errors";
import { addDays } from "@/lib/time";
import type { ActionState, AttendanceStatus, SessionStatus } from "@/lib/types";
import { ATTENDANCE_STATUSES } from "@/lib/types";

function readSession(fd: FormData) {
  return {
    session_date: String(fd.get("session_date") ?? ""),
    start_time: String(fd.get("start_time") ?? ""),
    end_time: String(fd.get("end_time") ?? ""),
    location: String(fd.get("location") ?? "").trim() || null,
    notes: String(fd.get("notes") ?? "").trim() || null,
    types: fd.getAll("types").map(String),
  };
}

export async function createSession(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = readSession(fd);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.session_date) || !s.start_time || !s.end_time) return { error: "genericError" };
  if (s.end_time <= s.start_time) return { error: "endAfterStart" };
  const weeks = fd.get("repeat") ? Math.min(Math.max(Number(fd.get("weeks") ?? 1), 1), 26) : 1;
  const supabase = await createClient();
  const rows = Array.from({ length: weeks }, (_, i) => ({
    session_date: addDays(s.session_date, i * 7),
    start_time: s.start_time,
    end_time: s.end_time,
    location: s.location,
    notes: s.notes,
  }));
  const { data, error } = await supabase.from("sessions").insert(rows).select("id");
  if (error) return { error: errorKey(error) };
  if (s.types.length) {
    const links = data.flatMap((d) => s.types.map((tt) => ({ session_id: d.id, training_type_id: tt })));
    const { error: e2 } = await supabase.from("session_training_types").insert(links);
    if (e2) return { error: errorKey(e2) };
  }
  revalidatePath("/sessions");
  revalidatePath("/dashboard");
  redirect(weeks === 1 ? `/sessions/${data[0].id}` : `/sessions?created=${weeks}`);
}

export async function updateSession(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("id"));
  const s = readSession(fd);
  if (s.end_time <= s.start_time) return { error: "endAfterStart" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .update({ session_date: s.session_date, start_time: s.start_time, end_time: s.end_time, location: s.location, notes: s.notes })
    .eq("id", id);
  if (error) return { error: errorKey(error) };
  const { error: e1 } = await supabase.from("session_training_types").delete().eq("session_id", id);
  if (e1) return { error: errorKey(e1) };
  if (s.types.length) {
    const { error: e2 } = await supabase
      .from("session_training_types")
      .insert(s.types.map((tt) => ({ session_id: id, training_type_id: tt })));
    if (e2) return { error: errorKey(e2) };
  }
  revalidatePath(`/sessions/${id}`);
  redirect(`/sessions/${id}`);
}

export async function setSessionStatus(fd: FormData) {
  const id = String(fd.get("id"));
  const status = String(fd.get("status")) as SessionStatus;
  if (!["scheduled", "completed", "cancelled"].includes(status)) return;
  const supabase = await createClient();
  await supabase.from("sessions").update({ status }).eq("id", id);
  revalidatePath(`/sessions/${id}`);
  revalidatePath("/sessions");
}

export async function deleteSession(fd: FormData) {
  const id = String(fd.get("id"));
  const supabase = await createClient();
  await supabase.from("sessions").delete().eq("id", id);
  revalidatePath("/sessions");
  redirect("/sessions");
}

export async function regenerateCode(fd: FormData) {
  const id = String(fd.get("id"));
  const supabase = await createClient();
  await supabase.rpc("regenerate_session_code", { p_session_id: id });
  revalidatePath(`/sessions/${id}/qr`);
}

/** Manual add / correction of one attendance record by a coach. */
export async function setAttendance(input: {
  sessionId: string;
  athleteId: string;
  status: AttendanceStatus | null;
  note?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const note = input.note?.trim() || null;
  if (input.status === null) {
    const { error } = await supabase.from("attendance").delete().eq("session_id", input.sessionId).eq("athlete_id", input.athleteId);
    if (error) return { ok: false, error: errorKey(error) };
  } else {
    if (!ATTENDANCE_STATUSES.includes(input.status)) return { ok: false, error: "genericError" };
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("attendance").upsert(
      {
        session_id: input.sessionId,
        athlete_id: input.athleteId,
        status: input.status,
        method: "manual",
        note,
        recorded_by: auth.user?.id,
      },
      { onConflict: "session_id,athlete_id" },
    );
    if (error) return { ok: false, error: errorKey(error) };
  }
  // the action response then carries the refreshed page (stats, roster, change log)
  revalidatePath(`/sessions/${input.sessionId}`);
  return { ok: true };
}

export async function selfCheckIn(_: ActionState, fd: FormData): Promise<ActionState> {
  const code = String(fd.get("code") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_in", { p_code: code });
  if (error) return { error: errorKey(error) };
  const r = data as { ok: boolean; error?: string; status?: AttendanceStatus; opens_at?: string; session_id?: string };
  revalidatePath("/me");
  if (r.ok) return { ok: true, message: r.status === "late" ? "ci_ok_late" : "ci_ok_present", data: { session_id: r.session_id ?? "" } };
  return { error: `ci_${r.error}`, data: { opens_at: r.opens_at ?? "" } };
}
