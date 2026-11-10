import Link from "next/link";
import type { Lang, T } from "@/lib/i18n/dict";
import { RATING_KEYS, type Evaluation } from "@/lib/types";
import { formatMonth } from "@/lib/time";

function avg(e: Evaluation) {
  return RATING_KEYS.reduce((s, k) => s + e[k], 0) / RATING_KEYS.length;
}

function Dots({ v }: { v: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${v}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`h-2 w-2 rounded-full ${i <= v ? "bg-brand-500" : "bg-slate-200"}`} />
      ))}
    </span>
  );
}

export function EvaluationHistory({
  evaluations,
  coachNames,
  lang,
  t,
  editHref,
}: {
  evaluations: Evaluation[]; // newest first
  coachNames: Map<string, string>;
  lang: Lang;
  t: T;
  editHref?: (e: Evaluation) => string;
}) {
  if (evaluations.length === 0) return <p className="card text-sm text-slate-500">{t("noEvaluations")}</p>;
  return (
    <div className="space-y-3">
      {evaluations.map((e, idx) => {
        const prev = evaluations[idx + 1];
        const a = avg(e);
        const delta = prev ? a - avg(prev) : null;
        return (
          <article key={e.id} className="card">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold">{formatMonth(e.month.slice(0, 7), lang)}</h3>
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded-full bg-brand-50 px-2 py-0.5 font-bold text-brand-700">
                  {t("average")} {a.toFixed(1)}
                </span>
                {delta !== null && delta !== 0 && (
                  <span className={delta > 0 ? "text-green-600" : "text-red-600"} title={t("vsPrevious")}>
                    {delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}
                  </span>
                )}
                {editHref && (
                  <Link href={editHref(e)} className="text-brand-600 underline">
                    {t("edit")}
                  </Link>
                )}
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
              {RATING_KEYS.map((k) => {
                const d = prev ? e[k] - prev[k] : 0;
                return (
                  <div key={k} className="flex items-center justify-between gap-2">
                    <dt className="text-slate-600">{t(k)}</dt>
                    <dd className="flex items-center gap-2">
                      <Dots v={e[k]} />
                      <span className="w-4 text-xs font-bold">{e[k]}</span>
                      <span className={`w-4 text-xs ${d > 0 ? "text-green-600" : d < 0 ? "text-red-600" : "text-transparent"}`}>
                        {d > 0 ? "▲" : d < 0 ? "▼" : "·"}
                      </span>
                    </dd>
                  </div>
                );
              })}
            </dl>
            {e.comment && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-sm text-slate-700">💬 {e.comment}</p>}
            {e.next_goal && (
              <p className="mt-2 text-sm text-slate-700">
                🎯 <b>{t("nextGoal")}:</b> {e.next_goal}
              </p>
            )}
            {typeof e.attendance_summary?.rate === "number" && (
              <p className="mt-2 text-xs text-slate-500">
                {t("attendanceRate")}: {e.attendance_summary.rate}% ({(e.attendance_summary.present ?? 0) + (e.attendance_summary.late ?? 0)}/
                {e.attendance_summary.expected ?? 0})
              </p>
            )}
            {e.coach_id && coachNames.get(e.coach_id) && (
              <p className="mt-1 text-xs text-slate-400">{t("by", { name: coachNames.get(e.coach_id)! })}</p>
            )}
          </article>
        );
      })}
    </div>
  );
}
