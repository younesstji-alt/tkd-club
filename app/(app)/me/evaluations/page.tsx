import { requireAthlete } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui";
import { EvaluationHistory } from "@/components/EvaluationHistory";
import type { Evaluation } from "@/lib/types";

export default async function MyEvaluations() {
  const { supabase, athlete } = await requireAthlete();
  const { t, lang } = await getT();
  const { data } = await supabase.from("evaluations").select("*").eq("athlete_id", athlete.id).order("month", { ascending: false });
  return (
    <>
      <PageHeader title={t("myEvaluations")} />
      <EvaluationHistory evaluations={(data ?? []) as Evaluation[]} coachNames={new Map()} lang={lang} t={t} />
    </>
  );
}
