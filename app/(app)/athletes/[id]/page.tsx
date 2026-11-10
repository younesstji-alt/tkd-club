import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { getTrainingTypes, photoUrls, typeName } from "@/lib/data";
import { age, currentMonth, formatDate, isValidMonth } from "@/lib/time";
import { Avatar, PageHeader, TypeChip } from "@/components/ui";
import { MonthNav } from "@/components/MonthNav";
import { MonthCalendar, MonthStats, SessionHistory, TypeBreakdown, WeekProgress, loadAthleteMonth } from "@/components/AthleteMonthView";
import { EvaluationHistory } from "@/components/EvaluationHistory";
import { InviteBox } from "@/components/InviteBox";
import type { Athlete, Evaluation } from "@/lib/types";

export default async function AthletePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string; tab?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const month = isValidMonth(sp.month) ? sp.month : currentMonth();
  const tab = sp.tab === "evaluations" ? "evaluations" : sp.tab === "profile" ? "profile" : "attendance";
  const { supabase } = await requireStaff();
  const { t, lang } = await getT();

  const { data: athlete } = await supabase.from("athletes").select("*").eq("id", id).maybeSingle<Athlete>();
  if (!athlete) notFound();
  const [types, { data: links }, photos, { data: evals }, { data: staff }, { data: pendingInvite }] = await Promise.all([
    getTrainingTypes(supabase, true),
    supabase.from("athlete_training_types").select("training_type_id").eq("athlete_id", id),
    photoUrls(supabase, [athlete]),
    supabase.from("evaluations").select("*").eq("athlete_id", id).order("month", { ascending: false }),
    supabase.from("profiles").select("id,full_name").in("role", ["admin", "coach"]),
    supabase.from("invitations").select("id").eq("athlete_id", id).is("accepted_at", null).limit(1),
  ]);
  const myTypes = types.filter((tt) => (links ?? []).some((l) => l.training_type_id === tt.id));
  const coachNames = new Map((staff ?? []).map((p) => [p.id as string, p.full_name as string]));
  const tabHref = (k: string) => `/athletes/${id}?tab=${k}${tab === "attendance" && month !== currentMonth() ? `&month=${month}` : ""}`;
  const a = age(athlete.date_of_birth);

  return (
    <>
      <PageHeader
        title={athlete.full_name}
        back="/athletes"
        action={
          <Link href={`/athletes/${id}/edit`} className="btn-secondary">
            {t("edit")}
          </Link>
        }
      />

      <div className="card flex items-center gap-4">
        <Avatar name={athlete.full_name} url={photos.get(id)} size={72} />
        <div className="min-w-0 flex-1 space-y-1 text-sm">
          <div className="font-semibold text-slate-800">
            🥋 {athlete.belt ?? t("notSet")}
            {a !== null && <span className="font-normal text-slate-500"> · {a} {t("years")}</span>}
          </div>
          <div className="text-slate-600">
            ⚖️ {athlete.weight_kg ? `${athlete.weight_kg} ${t("kg")}` : t("notSet")}
            {athlete.weight_category && (
              <>
                {" · "}
                <span dir="ltr">{athlete.weight_category}</span>
              </>
            )}
          </div>
          {athlete.weight_updated_on && (
            <div className="text-xs text-slate-400">
              {t("weightUpdated")}: {formatDate(athlete.weight_updated_on, lang, { year: "numeric", weekday: undefined })}
            </div>
          )}
          <div className="flex flex-wrap gap-1 pt-1">
            {myTypes.map((tt) => (
              <TypeChip key={tt.id} name={typeName(tt, lang)} color={tt.color} />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {athlete.weekly_target && <span className="rounded-full bg-slate-200 px-2 py-1">{t("perWeek", { n: athlete.weekly_target })}</span>}
        <span className={`rounded-full px-2 py-1 ${athlete.profile_id ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-600"}`}>
          {athlete.profile_id ? t("hasLogin") : t("noLogin")}
        </span>
        {!athlete.active && <span className="rounded-full bg-red-100 px-2 py-1 text-red-700">{t("inactive")}</span>}
      </div>

      <div className="no-print my-4 grid grid-cols-3 rounded-xl bg-slate-200 p-1 text-sm font-semibold">
        {(["attendance", "evaluations", "profile"] as const).map((k) => (
          <Link key={k} href={tabHref(k)} className={`rounded-lg py-2 text-center ${tab === k ? "bg-white text-slate-900 shadow" : "text-slate-600"}`}>
            {t(k === "attendance" ? "attendance" : k === "evaluations" ? "evaluations" : "inviteToApp")}
          </Link>
        ))}
      </div>

      {tab === "attendance" && <AttendanceTab supabase={supabase} athlete={athlete} month={month} types={types} lang={lang} t={t} />}

      {tab === "evaluations" && (
        <>
          <Link href={`/athletes/${id}/evaluate`} className="btn-primary mb-3 w-full">
            + {t("evaluate")}
          </Link>
          <EvaluationHistory
            evaluations={(evals ?? []) as Evaluation[]}
            coachNames={coachNames}
            lang={lang}
            t={t}
            editHref={(e) => `/athletes/${id}/evaluate?month=${e.month.slice(0, 7)}`}
          />
        </>
      )}

      {tab === "profile" && (
        <div className="card">
          {athlete.profile_id ? (
            <p className="text-sm text-green-700">✓ {t("hasLogin")}</p>
          ) : (
            <>
              {pendingInvite && pendingInvite.length > 0 && <p className="mb-3 text-xs text-slate-500">{t("pendingInvites")}: 1</p>}
              <InviteBox athleteId={id} athleteName={athlete.full_name} />
            </>
          )}
        </div>
      )}
    </>
  );
}

async function AttendanceTab({
  supabase,
  athlete,
  month,
  types,
  lang,
  t,
}: {
  supabase: Awaited<ReturnType<typeof requireStaff>>["supabase"];
  athlete: Athlete;
  month: string;
  types: Awaited<ReturnType<typeof getTrainingTypes>>;
  lang: "ar" | "fr";
  t: Awaited<ReturnType<typeof getT>>["t"];
}) {
  const { rows, stMap } = await loadAthleteMonth(supabase, athlete.id, month);
  return (
    <div className="space-y-2">
      <MonthNav month={month} lang={lang} hrefFor={(m) => `/athletes/${athlete.id}?month=${m}`} />
      {month === currentMonth() && <WeekProgress supabase={supabase} athleteId={athlete.id} target={athlete.weekly_target} t={t} />}
      <MonthStats rows={rows} t={t} />
      <TypeBreakdown rows={rows} stMap={stMap} types={types} lang={lang} t={t} />
      <MonthCalendar rows={rows} month={month} lang={lang} t={t} />
      <SessionHistory rows={rows} stMap={stMap} types={types} lang={lang} t={t} />
    </div>
  );
}
