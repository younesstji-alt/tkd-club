import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { getTrainingTypes } from "@/lib/data";
import { currentMonth, formatMonth, isValidMonth } from "@/lib/time";
import { Alert, PageHeader, SectionTitle } from "@/components/ui";
import { MonthNav } from "@/components/MonthNav";
import { EvaluationForm } from "@/components/EvaluationForm";
import { MonthStats, TypeBreakdown, loadAthleteMonth } from "@/components/AthleteMonthView";
import type { Athlete, Evaluation } from "@/lib/types";

export default async function EvaluatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ month?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const month = isValidMonth(sp.month) ? sp.month : currentMonth();
  const { supabase } = await requireStaff();
  const { t, lang } = await getT();
  const [{ data: athlete }, { data: existing }, types, monthData] = await Promise.all([
    supabase.from("athletes").select("*").eq("id", id).maybeSingle<Athlete>(),
    supabase.from("evaluations").select("*").eq("athlete_id", id).eq("month", `${month}-01`).maybeSingle<Evaluation>(),
    getTrainingTypes(supabase, true),
    loadAthleteMonth(supabase, id, month),
  ]);
  if (!athlete) notFound();
  return (
    <>
      <PageHeader
        title={existing ? t("editEvaluation") : t("newEvaluation")}
        subtitle={`${athlete.full_name} · ${formatMonth(month, lang)}`}
        back={`/athletes/${id}?tab=evaluations`}
      />
      <MonthNav month={month} lang={lang} hrefFor={(m) => `/athletes/${id}/evaluate?month=${m}`} />
      <SectionTitle>{t("attendanceSummary")}</SectionTitle>
      <MonthStats rows={monthData.rows} t={t} />
      <TypeBreakdown rows={monthData.rows} stMap={monthData.stMap} types={types} lang={lang} t={t} />
      <SectionTitle>{t("evaluation")}</SectionTitle>
      <div className="mb-3">
        <Alert kind="info">{t("evaluationNote")}</Alert>
      </div>
      <div className="card">
        <EvaluationForm key={month} athleteId={id} month={month} existing={existing} />
      </div>
    </>
  );
}
