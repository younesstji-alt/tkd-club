"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { errorKey } from "@/lib/errors";
import { getExpectedRows } from "@/lib/data";
import { countRows } from "@/lib/stats";
import { isValidMonth, monthRange } from "@/lib/time";
import { RATING_KEYS, type ActionState } from "@/lib/types";

export async function saveEvaluation(_: ActionState, fd: FormData): Promise<ActionState> {
  const athleteId = String(fd.get("athlete_id") ?? "");
  const month = String(fd.get("month") ?? "");
  if (!isValidMonth(month)) return { error: "genericError" };
  const ratings: Record<string, number> = {};
  for (const k of RATING_KEYS) {
    const v = Number(fd.get(k));
    if (!Number.isInteger(v) || v < 1 || v > 5) return { error: "ratingRequired" };
    ratings[k] = v;
  }
  const supabase = await createClient();
  const { from, to } = monthRange(month);
  // attendance summary is filled automatically from session records
  const rows = await getExpectedRows(supabase, { from, to, athleteId });
  const summary = countRows(rows);
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("evaluations").upsert(
    {
      athlete_id: athleteId,
      month: from,
      ...ratings,
      comment: String(fd.get("comment") ?? "").trim() || null,
      next_goal: String(fd.get("next_goal") ?? "").trim() || null,
      attendance_summary: summary,
      coach_id: auth.user?.id,
    },
    { onConflict: "athlete_id,month" },
  );
  if (error) return { error: errorKey(error) };
  revalidatePath(`/athletes/${athleteId}`);
  revalidatePath("/evaluations");
  redirect(`/athletes/${athleteId}?tab=evaluations`);
}
