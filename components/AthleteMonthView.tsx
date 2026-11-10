import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lang, T } from "@/lib/i18n/dict";
import type { AttendanceStatus, ExpectedRow, TrainingType } from "@/lib/types";
import { getExpectedRows, getSessionTypeRows, typeName } from "@/lib/data";
import { countRows, sessionTypeMap } from "@/lib/stats";
import { addDays, formatDate, formatTime, monthRange, todayISO, weekdayIndex } from "@/lib/time";
import { ATT_DOT, AttendanceBadge, RateBar, SectionTitle, Stat } from "./ui";

export async function loadAthleteMonth(supabase: SupabaseClient, athleteId: string, month: string) {
  const { from, to } = monthRange(month);
  const rows = await getExpectedRows(supabase, { from, to, athleteId });
  const typeRows = await getSessionTypeRows(supabase, [...new Set(rows.map((r) => r.session_id))]);
  return { rows, stMap: sessionTypeMap(typeRows) };
}

export function MonthStats({ rows, t }: { rows: ExpectedRow[]; t: T }) {
  const c = countRows(rows);
  return (
    <div className="space-y-2">
      <div className="card">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">{t("attendanceRate")}</div>
            <div className="text-3xl font-black text-slate-900">{c.rate === null ? "—" : `${c.rate}%`}</div>
          </div>
          <div className="text-end text-sm text-slate-600">
            {c.present + c.late} / {c.expected} {t("attended")}
            {c.upcoming > 0 && <div className="text-xs text-slate-400">+{c.upcoming} {t("upcomingSession")}</div>}
          </div>
        </div>
        <div className="mt-2">
          <RateBar rate={c.rate} />
        </div>
        <p className="mt-2 text-[11px] text-slate-400">{t("rateHint")}</p>
      </div>
      <div className="grid grid-cols-5 gap-2">
        <Stat label={t("expected")} value={c.expected} />
        <Stat label={t("att_present")} value={c.present} tone="text-green-700" />
        <Stat label={t("att_late")} value={c.late} tone="text-amber-600" />
        <Stat label={t("att_absent")} value={c.absent} tone="text-red-600" />
        <Stat label={t("att_excused")} value={c.excused} tone="text-sky-700" />
      </div>
    </div>
  );
}

export function TypeBreakdown({
  rows,
  stMap,
  types,
  lang,
  t,
}: {
  rows: ExpectedRow[];
  stMap: Map<string, string[]>;
  types: TrainingType[];
  lang: Lang;
  t: T;
}) {
  const items = types
    .map((tt) => ({ tt, c: countRows(rows.filter((r) => (stMap.get(r.session_id) ?? []).includes(tt.id))) }))
    .filter((x) => x.c.expected + x.c.upcoming > 0);
  if (items.length === 0) return null;
  return (
    <>
      <SectionTitle>{t("byType")}</SectionTitle>
      <div className="card divide-y divide-slate-100 p-0">
        {items.map(({ tt, c }) => (
          <div key={tt.id} className="px-4 py-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 font-semibold">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tt.color }} />
                {typeName(tt, lang)}
              </span>
              <span className="text-slate-600">
                {c.present + c.late}/{c.expected} · <b>{c.rate === null ? "—" : `${c.rate}%`}</b>
              </span>
            </div>
            <div className="mt-1.5">
              <RateBar rate={c.rate} />
            </div>
            <div className="mt-1 flex gap-3 text-[11px] text-slate-500">
              <span>{t("att_late")}: {c.late}</span>
              <span>{t("att_absent")}: {c.absent}</span>
              <span>{t("att_excused")}: {c.excused}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function MonthCalendar({ rows, month, lang, t }: { rows: ExpectedRow[]; month: string; lang: Lang; t: T }) {
  const { from, days } = monthRange(month);
  const lead = weekdayIndex(from);
  const today = todayISO();
  const byDate = new Map<string, (AttendanceStatus | "pending")[]>();
  for (const r of rows) {
    const arr = byDate.get(r.session_date) ?? [];
    arr.push(r.effective_status ?? "pending");
    byDate.set(r.session_date, arr);
  }
  // weekday headers (Mon..Sun)
  const headers = Array.from({ length: 7 }, (_, i) => formatDate(addDays("2024-01-01", i), lang, { weekday: "narrow", day: undefined, month: undefined }));
  return (
    <>
      <SectionTitle>{t("calendar")}</SectionTitle>
      <div className="card p-3">
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400">
          {headers.map((h, i) => (
            <div key={i}>{h}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: lead }).map((_, i) => (
            <div key={`e${i}`} />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const d = `${month}-${String(i + 1).padStart(2, "0")}`;
            const st = byDate.get(d) ?? [];
            return (
              <div
                key={d}
                className={`flex aspect-square flex-col items-center justify-center rounded-lg text-xs ${st.length ? "bg-slate-50" : ""} ${d === today ? "ring-2 ring-brand-500" : ""}`}
              >
                <span className={st.length ? "font-bold text-slate-800" : "text-slate-400"}>{i + 1}</span>
                <span className="mt-0.5 flex gap-0.5">
                  {st.map((s, j) => (
                    <span key={j} className={`h-1.5 w-1.5 rounded-full ${ATT_DOT[s]}`} />
                  ))}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500">
          {(["present", "late", "absent", "excused", "pending"] as const).map((s) => (
            <span key={s} className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${ATT_DOT[s]}`} />
              {t(`att_${s}`)}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

export function SessionHistory({
  rows,
  stMap,
  types,
  lang,
  t,
}: {
  rows: ExpectedRow[];
  stMap: Map<string, string[]>;
  types: TrainingType[];
  lang: Lang;
  t: T;
}) {
  const typeById = new Map(types.map((tt) => [tt.id, tt]));
  return (
    <>
      <SectionTitle>{t("history")}</SectionTitle>
      {rows.length === 0 ? (
        <p className="card text-sm text-slate-500">{t("noData")}</p>
      ) : (
        <ul className="card divide-y divide-slate-100 p-0">
          {[...rows].reverse().map((r) => (
            <li key={r.session_id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <div className="w-24 shrink-0">
                <div className="font-medium">{formatDate(r.session_date, lang)}</div>
                <div className="text-xs text-slate-500" dir="ltr">
                  {formatTime(r.start_time)}
                </div>
              </div>
              <div className="flex min-w-0 flex-1 flex-wrap gap-1 text-xs text-slate-500">
                {(stMap.get(r.session_id) ?? []).map((id) => {
                  const tt = typeById.get(id);
                  return tt ? <span key={id}>{typeName(tt, lang)}</span> : null;
                })}
              </div>
              <AttendanceBadge status={r.effective_status} t={t} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Sessions attended (present/late) in the current Mon–Sun week vs weekly target. */
export async function WeekProgress({ supabase, athleteId, target, t }: { supabase: SupabaseClient; athleteId: string; target: number | null; t: T }) {
  if (!target) return null;
  const today = todayISO();
  const monday = addDays(today, -weekdayIndex(today));
  const rows = await getExpectedRows(supabase, { from: monday, to: addDays(monday, 6), athleteId });
  const done = rows.filter((r) => r.effective_status === "present" || r.effective_status === "late").length;
  const pct = Math.min(100, Math.round((done / target) * 100));
  return (
    <div className="card">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">{t("weekProgress")}</span>
        <span className="text-slate-600">
          {done} / {target}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
