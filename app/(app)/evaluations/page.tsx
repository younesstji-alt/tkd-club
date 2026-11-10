import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { currentMonth, formatMonth, isValidMonth } from "@/lib/time";
import { Alert, EmptyState, PageHeader } from "@/components/ui";
import { MonthNav } from "@/components/MonthNav";
import { RATING_KEYS, type Evaluation } from "@/lib/types";

export default async function EvaluationsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const sp = await searchParams;
  const month = isValidMonth(sp.month) ? sp.month : currentMonth();
  const { supabase } = await requireStaff();
  const { t, lang } = await getT();
  const [{ data: athletes }, { data: evals }] = await Promise.all([
    supabase.from("athletes").select("id,full_name").eq("active", true).order("full_name"),
    supabase.from("evaluations").select("*").eq("month", `${month}-01`),
  ]);
  const byAthlete = new Map(((evals ?? []) as Evaluation[]).map((e) => [e.athlete_id, e]));
  return (
    <>
      <PageHeader title={t("monthlyEvaluations")} subtitle={formatMonth(month, lang)} back="/dashboard" />
      <MonthNav month={month} lang={lang} hrefFor={(m) => `/evaluations?month=${m}`} />
      <div className="my-3">
        <Alert kind="info">{t("evaluationNote")}</Alert>
      </div>
      {(athletes ?? []).length === 0 ? (
        <EmptyState title={t("noAthletes")} />
      ) : (
        <ul className="card divide-y divide-slate-100 p-0">
          {(athletes ?? []).map((a) => {
            const e = byAthlete.get(a.id);
            const avg = e ? RATING_KEYS.reduce((s, k) => s + e[k], 0) / RATING_KEYS.length : null;
            return (
              <li key={a.id}>
                <Link href={`/athletes/${a.id}/evaluate?month=${month}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                  <span className="flex-1 font-medium">{a.full_name}</span>
                  {e ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                      ✓ {t("evaluated")} · {avg!.toFixed(1)}
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{t("notEvaluated")}</span>
                  )}
                  <span className="text-slate-400 rtl:rotate-180">›</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
