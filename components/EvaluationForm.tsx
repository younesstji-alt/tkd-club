"use client";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { saveEvaluation } from "@/app/actions/evaluations";
import { useI18n } from "@/lib/i18n/client";
import { RATING_KEYS, type Evaluation } from "@/lib/types";

export function EvaluationForm({ athleteId, month, existing }: { athleteId: string; month: string; existing?: Evaluation | null }) {
  const { t } = useI18n();
  return (
    <ActionForm action={saveEvaluation}>
      <input type="hidden" name="athlete_id" value={athleteId} />
      <input type="hidden" name="month" value={month} />
      <p className="text-xs text-slate-500">{t("ratingScale")}</p>
      {RATING_KEYS.map((k) => (
        <fieldset key={k}>
          <legend className="label">{t(k)}</legend>
          <div className="grid grid-cols-5 gap-2" dir="ltr">
            {[1, 2, 3, 4, 5].map((v) => (
              <label key={v} className="cursor-pointer">
                <input type="radio" name={k} value={v} required defaultChecked={existing?.[k] === v} className="peer sr-only" />
                <span className="flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white text-lg font-bold text-slate-600 peer-checked:border-brand-600 peer-checked:bg-brand-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500">
                  {v}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <Field label={t("comment")} htmlFor="comment">
        <textarea id="comment" name="comment" rows={4} maxLength={3000} defaultValue={existing?.comment ?? ""} className="input" />
      </Field>
      <Field label={`${t("nextGoal")} (${t("optional")})`} htmlFor="next_goal">
        <input id="next_goal" name="next_goal" maxLength={300} defaultValue={existing?.next_goal ?? ""} className="input" />
      </Field>
      <SubmitButton>{t("save")}</SubmitButton>
    </ActionForm>
  );
}
