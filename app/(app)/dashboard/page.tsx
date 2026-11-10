import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { getExpectedRows, getSessionTypeRows, getTrainingTypes } from "@/lib/data";
import { countRows, groupBy, sessionTypeMap } from "@/lib/stats";
import { currentMonth, formatDate, formatMonth, monthRange, todayISO } from "@/lib/time";
import { EmptyState, PageHeader, SectionTitle, Stat } from "@/components/ui";
import { SessionCard } from "@/components/SessionCard";
import type { Session } from "@/lib/types";

export default async function Dashboard() {
  const { supabase, profile } = await requireStaff();
  const { t, lang } = await getT();
  const today = todayISO();
  const month = currentMonth();
  const { from, to } = monthRange(month);

  const [{ data: todays }, types, rows, { data: athletes }, { count: evalCount }] = await Promise.all([
    supabase.from("sessions").select("*").eq("session_date", today).order("start_time"),
    getTrainingTypes(supabase, true),
    getExpectedRows(supabase, { from, to }),
    supabase.from("athletes").select("id,full_name").eq("active", true).order("full_name"),
    supabase.from("evaluations").select("id", { count: "exact", head: true }).eq("month", from),
  ]);
  const sessions = (todays ?? []) as Session[];
  const ids = sessions.map((s) => s.id);
  const [typeRows, { data: att }] = await Promise.all([
    getSessionTypeRows(supabase, ids),
    ids.length ? supabase.from("attendance").select("session_id,status").in("session_id", ids) : Promise.resolve({ data: [] }),
  ]);
  const stMap = sessionTypeMap(typeRows);
  const typeById = new Map(types.map((tt) => [tt.id, tt]));
  const todayRows = rows.filter((r) => r.session_date === today);
  const expectedBySession = groupBy(todayRows, (r) => r.session_id);

  const monthCounts = countRows(rows);
  const heldSessions = new Set(rows.filter((r) => r.effective_status).map((r) => r.session_id)).size;
  const byAthlete = groupBy(rows, (r) => r.athlete_id);
  const followUp = (athletes ?? []).filter((a) => {
    const c = countRows(byAthlete.get(a.id) ?? []);
    return c.expected >= 3 && c.rate !== null && c.rate < 60;
  });

  return (
    <>
      <PageHeader title={t("hello", { name: profile.full_name.split(" ")[0] })} subtitle={formatDate(today, lang, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} />

      <div className="grid grid-cols-2 gap-2">
        <Link href="/sessions/new" className="btn-primary">
          + {t("newSession")}
        </Link>
        <Link href="/athletes/new" className="btn-secondary">
          + {t("newAthlete")}
        </Link>
      </div>

      <SectionTitle>{t("todaySessions")}</SectionTitle>
      {sessions.length === 0 ? (
        <EmptyState icon="🗓️" title={t("noSessionsToday")} />
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const recs = (att ?? []).filter((a) => a.session_id === s.id);
            const inCount = recs.filter((a) => a.status === "present" || a.status === "late").length;
            const expected = expectedBySession.get(s.id)?.length ?? 0;
            return (
              <div key={s.id} className="space-y-1">
                <SessionCard
                  session={s}
                  lang={lang}
                  t={t}
                  showDate={false}
                  href={`/sessions/${s.id}`}
                  types={(stMap.get(s.id) ?? []).map((id) => typeById.get(id)!).filter(Boolean)}
                  right={
                    s.status !== "cancelled" ? (
                      <div className="text-center">
                        <div className="text-2xl font-black text-brand-600">
                          {inCount}
                          <span className="text-sm font-medium text-slate-400">/{expected}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">{t("attended")}</div>
                      </div>
                    ) : null
                  }
                />
                {s.status !== "cancelled" && (
                  <Link href={`/sessions/${s.id}/qr`} className="btn-ghost w-full text-sm">
                    ▣ {t("showQr")}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      <SectionTitle action={<Link href={`/reports?month=${month}`} className="text-sm text-brand-600">{t("navReports")} ›</Link>}>
        {t("monthSummary")} · {formatMonth(month, lang)}
      </SectionTitle>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label={t("attendanceRate")} value={monthCounts.rate === null ? "—" : `${monthCounts.rate}%`} />
        <Stat label={t("sessionsThisMonth")} value={heldSessions} />
        <Stat label={t("activeAthletes")} value={athletes?.length ?? 0} />
        <Link href={`/evaluations?month=${month}`} className="block">
          <Stat label={t("monthlyEvaluations")} value={`${evalCount ?? 0}/${athletes?.length ?? 0}`} hint={`${t("evaluate")} ›`} />
        </Link>
      </div>

      {followUp.length > 0 && (
        <>
          <SectionTitle>{t("needsAttention")}</SectionTitle>
          <div className="card">
            <p className="mb-2 text-xs text-slate-500">{t("lowAttendanceHint")}</p>
            <div className="flex flex-wrap gap-2">
              {followUp.map((a) => (
                <Link key={a.id} href={`/athletes/${a.id}`} className="rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-800 ring-1 ring-amber-200">
                  {a.full_name}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
