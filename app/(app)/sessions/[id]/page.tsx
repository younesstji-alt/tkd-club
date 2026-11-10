import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { getExpectedRows, getTrainingTypes, photoUrls, typeName } from "@/lib/data";
import { countRows } from "@/lib/stats";
import { formatDate, formatDateTime, formatTime } from "@/lib/time";
import { AttendanceBadge, PageHeader, SectionTitle, SessionStatusBadge, Stat, TypeChip } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { Roster, type RosterRow } from "@/components/Roster";
import { deleteSession, setSessionStatus } from "@/app/actions/sessions";
import type { Athlete, AttendanceStatus, Session } from "@/lib/types";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const { t, lang } = await getT();
  const { data: session } = await supabase.from("sessions").select("*").eq("id", id).maybeSingle<Session>();
  if (!session) notFound();

  const [types, { data: links }, expected, { data: records }, { data: athletesData }, { data: changes }] = await Promise.all([
    getTrainingTypes(supabase, true),
    supabase.from("session_training_types").select("training_type_id").eq("session_id", id),
    session.status === "cancelled"
      ? Promise.resolve([])
      : getExpectedRows(supabase, { from: session.session_date, to: session.session_date, sessionId: id }),
    supabase.from("attendance").select("athlete_id,status,method,checked_in_at,note").eq("session_id", id),
    supabase.from("athletes").select("id,full_name,photo_path,active").order("full_name"),
    supabase
      .from("attendance_changes")
      .select("id,athlete_id,old_status,new_status,note,changed_at,changed_by,profiles:changed_by(full_name)")
      .eq("session_id", id)
      .order("changed_at", { ascending: false })
      .limit(50),
  ]);
  const athletes = (athletesData ?? []) as Pick<Athlete, "id" | "full_name" | "photo_path" | "active">[];
  const nameById = new Map(athletes.map((a) => [a.id, a.full_name]));
  const photos = await photoUrls(supabase, athletes);
  const recById = new Map((records ?? []).map((r) => [r.athlete_id as string, r]));
  const sessionTypes = types.filter((tt) => (links ?? []).some((l) => l.training_type_id === tt.id));

  const rows: RosterRow[] = expected.map((e) => {
    const rec = recById.get(e.athlete_id);
    return {
      athlete_id: e.athlete_id,
      name: nameById.get(e.athlete_id) ?? "—",
      photo: photos.get(e.athlete_id),
      status: (rec?.status as AttendanceStatus) ?? null,
      effective: e.effective_status,
      method: rec?.method ?? null,
      checked_in_at: rec?.checked_in_at ?? null,
      note: rec?.note ?? null,
    };
  });
  rows.sort((a, b) => a.name.localeCompare(b.name, lang));
  const inRoster = new Set(rows.map((r) => r.athlete_id));
  const others = athletes.filter((a) => a.active && !inRoster.has(a.id)).map((a) => ({ id: a.id, name: a.full_name }));
  const c = countRows(expected.map((e) => ({ effective_status: e.effective_status ?? (recById.get(e.athlete_id)?.status as AttendanceStatus) ?? null })));

  return (
    <>
      <PageHeader
        title={formatDate(session.session_date, lang, { weekday: "long", day: "numeric", month: "long" })}
        subtitle={
          <span dir="ltr">
            {formatTime(session.start_time)}–{formatTime(session.end_time)}
          </span>
        }
        back="/sessions"
        action={
          <Link href={`/sessions/${id}/edit`} className="btn-secondary">
            {t("edit")}
          </Link>
        }
      />

      <div className="card space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <SessionStatusBadge status={session.status} t={t} />
          {session.location && <span className="text-sm text-slate-600">📍 {session.location}</span>}
        </div>
        {sessionTypes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {sessionTypes.map((tt) => (
              <TypeChip key={tt.id} name={typeName(tt, lang)} color={tt.color} />
            ))}
          </div>
        )}
        {session.notes && <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-sm text-slate-700">{session.notes}</p>}
        {session.status !== "cancelled" && (
          <Link href={`/sessions/${id}/qr`} className="btn-primary mt-2 w-full py-3 text-base">
            ▣ {t("showQr")}
          </Link>
        )}
        <div className="flex flex-wrap gap-2 pt-1 [&>form]:flex-1 [&_button]:w-full">
          {session.status === "scheduled" && (
            <form action={setSessionStatus}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="status" value="completed" />
              <SubmitButton className="btn-secondary">✓ {t("markCompleted")}</SubmitButton>
            </form>
          )}
          {session.status === "scheduled" && (
            <form action={setSessionStatus}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="status" value="cancelled" />
              <SubmitButton className="btn-danger" confirm={t("cancelSession") + "?"}>
                {t("cancelSession")}
              </SubmitButton>
            </form>
          )}
          {session.status !== "scheduled" && (
            <form action={setSessionStatus}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="status" value="scheduled" />
              <SubmitButton className="btn-secondary">{t("reopenSession")}</SubmitButton>
            </form>
          )}
        </div>
        {session.status === "cancelled" && <p className="text-xs text-slate-500">{t("cancelledExcluded")}</p>}
      </div>

      {session.status !== "cancelled" && (
        <>
          <div className="mt-4 grid grid-cols-4 gap-2">
            <Stat label={t("att_present")} value={c.present} tone="text-green-700" />
            <Stat label={t("att_late")} value={c.late} tone="text-amber-600" />
            <Stat label={t("att_absent")} value={c.absent} tone="text-red-600" />
            <Stat label={t("att_excused")} value={c.excused} tone="text-sky-700" />
          </div>
          <SectionTitle>
            {t("roster")} ({rows.length})
          </SectionTitle>
          <Roster sessionId={id} rows={rows} others={others} />
        </>
      )}

      <SectionTitle>{t("changeLog")}</SectionTitle>
      {(changes ?? []).length === 0 ? (
        <p className="text-sm text-slate-500">{t("noChanges")}</p>
      ) : (
        <ul className="card divide-y divide-slate-100 p-0">
          {(changes ?? []).map((ch) => {
            const by = (ch.profiles as unknown as { full_name: string } | null)?.full_name;
            return (
              <li key={ch.id} className="flex flex-wrap items-center gap-1.5 px-3 py-2 text-sm">
                <span className="font-medium">{nameById.get(ch.athlete_id) ?? "—"}</span>
                <AttendanceBadge status={ch.old_status} t={t} />
                <span className="rtl:rotate-180">→</span>
                {ch.new_status ? <AttendanceBadge status={ch.new_status} t={t} /> : <span className="text-xs">{t("clearRecord")}</span>}
                {ch.note && <span className="text-slate-600">“{ch.note}”</span>}
                <span className="ms-auto text-xs text-slate-400">
                  {by ? `${t("changedBy")} ${by} · ` : ""}
                  {formatDateTime(ch.changed_at, lang)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <form action={deleteSession} className="mt-8">
        <input type="hidden" name="id" value={id} />
        <SubmitButton className="btn-ghost w-full text-red-600" confirm={t("confirmDeleteSession")}>
          {t("deleteSession")}
        </SubmitButton>
      </form>
    </>
  );
}
