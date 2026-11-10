import Link from "next/link";
import { requireAthlete } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { getTrainingTypes, photoUrls, typeName } from "@/lib/data";
import { currentMonth, formatDate, isValidMonth } from "@/lib/time";
import { Avatar, PageHeader, SectionTitle, TypeChip } from "@/components/ui";
import { MonthNav } from "@/components/MonthNav";
import { MonthCalendar, MonthStats, SessionHistory, TypeBreakdown, WeekProgress, loadAthleteMonth } from "@/components/AthleteMonthView";
import type { Athlete } from "@/lib/types";

export default async function MyHome({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const sp = await searchParams;
  const month = isValidMonth(sp.month) ? sp.month : currentMonth();
  const { supabase, athlete: a } = await requireAthlete();
  const athlete = a as Athlete;
  const { t, lang } = await getT();
  const [types, { data: links }, photos, monthData] = await Promise.all([
    getTrainingTypes(supabase, true),
    supabase.from("athlete_training_types").select("training_type_id").eq("athlete_id", athlete.id),
    photoUrls(supabase, [athlete]),
    loadAthleteMonth(supabase, athlete.id, month),
  ]);
  const myTypes = types.filter((tt) => (links ?? []).some((l) => l.training_type_id === tt.id));

  return (
    <>
      <PageHeader title={t("hello", { name: athlete.full_name.split(" ")[0] })} />
      <Link href="/check-in" className="btn-primary mb-4 w-full py-4 text-base">
        ▣ {t("checkInTitle")}
      </Link>

      <div className="card flex items-center gap-4">
        <Avatar name={athlete.full_name} url={photos.get(athlete.id)} size={64} />
        <div className="min-w-0 flex-1 space-y-1 text-sm">
          <div className="font-semibold">🥋 {athlete.belt ?? t("notSet")}</div>
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

      <div className="mt-3 space-y-2">
        {month === currentMonth() && <WeekProgress supabase={supabase} athleteId={athlete.id} target={athlete.weekly_target} t={t} />}
        <SectionTitle>{t("myAttendance")}</SectionTitle>
        <MonthNav month={month} lang={lang} hrefFor={(m) => `/me?month=${m}`} />
        <MonthStats rows={monthData.rows} t={t} />
        <TypeBreakdown rows={monthData.rows} stMap={monthData.stMap} types={types} lang={lang} t={t} />
        <MonthCalendar rows={monthData.rows} month={month} lang={lang} t={t} />
        <SessionHistory rows={monthData.rows} stMap={monthData.stMap} types={types} lang={lang} t={t} />
      </div>
    </>
  );
}
