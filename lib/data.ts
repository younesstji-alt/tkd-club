import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lang } from "./i18n/dict";
import type { Athlete, ExpectedRow, TrainingType } from "./types";

export async function getTrainingTypes(supabase: SupabaseClient, includeInactive = false): Promise<TrainingType[]> {
  let q = supabase.from("training_types").select("*").order("sort_order").order("created_at");
  if (!includeInactive) q = q.eq("active", true);
  const { data } = await q;
  return (data ?? []) as TrainingType[];
}

export function typeName(tt: Pick<TrainingType, "name_ar" | "name_fr">, lang: Lang) {
  return lang === "fr" ? tt.name_fr : tt.name_ar;
}

export async function getExpectedRows(
  supabase: SupabaseClient,
  opts: { from: string; to: string; athleteId?: string; sessionId?: string },
): Promise<ExpectedRow[]> {
  let q = supabase
    .from("attendance_expected")
    .select("session_id,session_date,start_time,end_time,session_status,athlete_id,recorded_status,checked_in_at,method,effective_status")
    .gte("session_date", opts.from)
    .lte("session_date", opts.to)
    .order("session_date")
    .order("start_time");
  if (opts.athleteId) q = q.eq("athlete_id", opts.athleteId);
  if (opts.sessionId) q = q.eq("session_id", opts.sessionId);
  const { data, error } = await q.limit(10000);
  if (error) throw error;
  return (data ?? []) as ExpectedRow[];
}

export async function getSessionTypeRows(supabase: SupabaseClient, sessionIds: string[]) {
  if (sessionIds.length === 0) return [] as { session_id: string; training_type_id: string }[];
  const out: { session_id: string; training_type_id: string }[] = [];
  for (let i = 0; i < sessionIds.length; i += 200) {
    const { data } = await supabase
      .from("session_training_types")
      .select("session_id,training_type_id")
      .in("session_id", sessionIds.slice(i, i + 200));
    out.push(...((data ?? []) as typeof out));
  }
  return out;
}

/** Signed URLs (1h) for private athlete photos. */
export async function photoUrls(supabase: SupabaseClient, athletes: Pick<Athlete, "id" | "photo_path">[]) {
  const paths = athletes.map((a) => a.photo_path).filter((p): p is string => !!p);
  const map = new Map<string, string>();
  if (paths.length === 0) return map;
  const { data } = await supabase.storage.from("athlete-photos").createSignedUrls(paths, 3600);
  for (const d of data ?? []) if (d.path && d.signedUrl) map.set(d.path, d.signedUrl);
  const byAthlete = new Map<string, string>();
  for (const a of athletes) if (a.photo_path && map.has(a.photo_path)) byAthlete.set(a.id, map.get(a.photo_path)!);
  return byAthlete;
}
