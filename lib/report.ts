import type { SupabaseClient } from "@supabase/supabase-js";
import { getExpectedRows, getSessionTypeRows, getTrainingTypes } from "./data";
import { countRows, groupBy, sessionTypeMap } from "./stats";
import { monthRange, todayISO } from "./time";
import type { Counts, TrainingType } from "./types";

export interface ReportRow {
  athlete_id: string;
  name: string;
  belt: string | null;
  active: boolean;
  counts: Counts;
}

export async function buildMonthlyReport(
  supabase: SupabaseClient,
  opts: { month: string; athleteId?: string; typeId?: string },
) {
  const { from, to } = monthRange(opts.month);
  const [rowsAll, types, { data: athletes }, { data: sessions }] = await Promise.all([
    getExpectedRows(supabase, { from, to, athleteId: opts.athleteId }),
    getTrainingTypes(supabase, true),
    supabase.from("athletes").select("id,full_name,belt,active").order("full_name"),
    supabase.from("sessions").select("id,status,session_date").gte("session_date", from).lte("session_date", to),
  ]);
  const stMap = sessionTypeMap(await getSessionTypeRows(supabase, [...new Set(rowsAll.map((r) => r.session_id))]));
  const rows = opts.typeId ? rowsAll.filter((r) => (stMap.get(r.session_id) ?? []).includes(opts.typeId!)) : rowsAll;
  const byAthlete = groupBy(rows, (r) => r.athlete_id);
  const list: ReportRow[] = (athletes ?? [])
    .filter((a) => byAthlete.has(a.id) || (!opts.athleteId && a.active))
    .filter((a) => !opts.athleteId || a.id === opts.athleteId)
    .map((a) => ({ athlete_id: a.id, name: a.full_name, belt: a.belt, active: a.active, counts: countRows(byAthlete.get(a.id) ?? []) }));

  const totals = countRows(rows);
  const byType = types
    .map((tt) => ({ type: tt, counts: countRows(rows.filter((r) => (stMap.get(r.session_id) ?? []).includes(tt.id))) }))
    .filter((x) => x.counts.expected + x.counts.upcoming > 0);
  const sessionCounts = {
    held: (sessions ?? []).filter((s) => s.status !== "cancelled" && s.session_date <= todayISO()).length,
    cancelled: (sessions ?? []).filter((s) => s.status === "cancelled").length,
  };
  return { list, totals, byType, types: types as TrainingType[], sessionCounts, athletes: athletes ?? [] };
}
