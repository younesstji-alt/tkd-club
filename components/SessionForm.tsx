"use client";
import { useState } from "react";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { useI18n } from "@/lib/i18n/client";
import type { ActionState, Session, TrainingType } from "@/lib/types";

export function SessionForm({
  action,
  types,
  session,
  selectedTypes = [],
  defaultDate,
}: {
  action: (p: ActionState, fd: FormData) => Promise<ActionState>;
  types: TrainingType[];
  session?: Session;
  selectedTypes?: string[];
  defaultDate: string;
}) {
  const { t, lang } = useI18n();
  const [repeat, setRepeat] = useState(false);
  return (
    <ActionForm action={action}>
      {session && <input type="hidden" name="id" value={session.id} />}
      <Field label={t("date")} htmlFor="session_date">
        <input id="session_date" name="session_date" type="date" required defaultValue={session?.session_date ?? defaultDate} className="input" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("startTime")} htmlFor="start_time">
          <input id="start_time" name="start_time" type="time" required defaultValue={session?.start_time.slice(0, 5) ?? "18:00"} className="input" />
        </Field>
        <Field label={t("endTime")} htmlFor="end_time">
          <input id="end_time" name="end_time" type="time" required defaultValue={session?.end_time.slice(0, 5) ?? "19:30"} className="input" />
        </Field>
      </div>
      <Field label={t("location")} htmlFor="location">
        <input id="location" name="location" maxLength={120} defaultValue={session?.location ?? ""} className="input" />
      </Field>
      <fieldset>
        <legend className="label">{t("trainingTypes")}</legend>
        <div className="flex flex-wrap gap-2">
          {types.map((tt) => (
            <label key={tt.id} className="cursor-pointer">
              <input type="checkbox" name="types" value={tt.id} defaultChecked={selectedTypes.includes(tt.id)} className="peer sr-only" />
              <span
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 text-sm peer-checked:border-brand-600 peer-checked:bg-brand-50 peer-checked:font-semibold peer-checked:text-brand-700 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tt.color }} />
                {lang === "fr" ? tt.name_fr : tt.name_ar}
              </span>
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-slate-500">{t("allTypesSession")}</p>
      </fieldset>
      <Field label={`${t("coachNotes")} (${t("optional")})`} htmlFor="notes">
        <textarea id="notes" name="notes" rows={3} maxLength={2000} defaultValue={session?.notes ?? ""} className="input" />
      </Field>
      {!session && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="repeat" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} className="h-5 w-5" />
            {t("repeatWeekly")}
          </label>
          {repeat && (
            <div className="mt-3">
              <Field label={t("repeatWeeks")} hint={t("repeatHint")} htmlFor="weeks">
                <input id="weeks" name="weeks" type="number" min={2} max={26} defaultValue={4} className="input" />
              </Field>
            </div>
          )}
        </div>
      )}
      <SubmitButton>{session ? t("save") : t("create")}</SubmitButton>
    </ActionForm>
  );
}
