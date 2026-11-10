import { requireAthlete } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { getExpectedRows, getTrainingTypes, typeName } from "@/lib/data";
import { addDays, formatDate, formatTime, todayISO } from "@/lib/time";
import { EmptyState, PageHeader, SessionStatusBadge, TypeChip } from "@/components/ui";
import type { Session } from "@/lib/types";

export default async function MySchedule() {
  const { supabase, athlete } = await requireAthlete();
  const { t, lang } = await getT();
  const today = todayISO();
  const to = addDays(today, 21);
  // expected sessions for my training types (cancelled ones are shown separately)
  const [expected, types, { data: allSessions }] = await Promise.all([
    getExpectedRows(supabase, { from: today, to, athleteId: athlete.id }),
    getTrainingTypes(supabase, true),
    supabase.from("sessions").select("*, session_training_types(training_type_id)").gte("session_date", today).lte("session_date", to).order("session_date").order("start_time"),
  ]);
  const mine = new Set(expected.map((e) => e.session_id));
  const statusBySession = new Map(expected.map((e) => [e.session_id, e.recorded_status]));
  const { data: myLinks } = await supabase.from("athlete_training_types").select("training_type_id").eq("athlete_id", athlete.id);
  const myTypeIds = new Set((myLinks ?? []).map((l) => l.training_type_id as string));
  const typeById = new Map(types.map((tt) => [tt.id, tt]));
  const sessions = ((allSessions ?? []) as (Session & { session_training_types: { training_type_id: string }[] })[]).filter(
    (s) =>
      mine.has(s.id) ||
      (s.status === "cancelled" &&
        (s.session_training_types.length === 0 || s.session_training_types.some((x) => myTypeIds.has(x.training_type_id)))),
  );

  return (
    <>
      <PageHeader title={t("mySchedule")} subtitle={t("nextSessions")} />
      {sessions.length === 0 ? (
        <EmptyState icon="📅" title={t("noUpcoming")} />
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li key={s.id} className={`card ${s.status === "cancelled" ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold">{formatDate(s.session_date, lang, { weekday: "long", day: "numeric", month: "long" })}</span>
                <span className="text-slate-600" dir="ltr">
                  {formatTime(s.start_time)}–{formatTime(s.end_time)}
                </span>
                {s.status !== "scheduled" && <SessionStatusBadge status={s.status} t={t} />}
                {statusBySession.get(s.id) && <span className="text-xs text-green-700">✓ {t(`att_${statusBySession.get(s.id)!}`)}</span>}
              </div>
              {s.location && <div className="mt-0.5 text-sm text-slate-500">📍 {s.location}</div>}
              <div className="mt-2 flex flex-wrap gap-1">
                {s.session_training_types.map((x) => {
                  const tt = typeById.get(x.training_type_id);
                  return tt ? <TypeChip key={tt.id} name={typeName(tt, lang)} color={tt.color} /> : null;
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
