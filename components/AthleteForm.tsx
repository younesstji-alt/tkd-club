"use client";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { saveAthlete } from "@/app/actions/athletes";
import { useI18n } from "@/lib/i18n/client";
import type { Athlete, TrainingType } from "@/lib/types";

export function AthleteForm({ athlete, types, selected = [] }: { athlete?: Athlete; types: TrainingType[]; selected?: string[] }) {
  const { t, lang } = useI18n();
  return (
    <ActionForm action={saveAthlete}>
      {athlete && <input type="hidden" name="id" value={athlete.id} />}
      <Field label={t("fullName")} htmlFor="full_name">
        <input id="full_name" name="full_name" required maxLength={120} defaultValue={athlete?.full_name} className="input" />
      </Field>
      <Field label={`${t("photo")} (${t("optional")})`} htmlFor="photo" hint="JPG / PNG / WebP · max 3 MB">
        <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="user" className="input" />
      </Field>
      {athlete?.photo_path && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="remove_photo" className="h-4 w-4" /> {t("delete")} {t("photo")}
        </label>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("belt")} htmlFor="belt">
          <input id="belt" name="belt" maxLength={60} defaultValue={athlete?.belt ?? ""} className="input" />
        </Field>
        <Field label={t("dateOfBirth")} htmlFor="date_of_birth">
          <input id="date_of_birth" name="date_of_birth" type="date" defaultValue={athlete?.date_of_birth ?? ""} className="input" />
        </Field>
      </div>
      <fieldset className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
        <legend className="px-1 text-xs font-medium text-amber-800">🔒 {t("privateInfo")}</legend>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`${t("weight")} (${t("kg")})`} htmlFor="weight_kg">
            <input id="weight_kg" name="weight_kg" type="number" step="0.1" min={10} max={250} inputMode="decimal" defaultValue={athlete?.weight_kg ?? ""} className="input" />
          </Field>
          <Field label={t("weightCategory")} htmlFor="weight_category">
            <input id="weight_category" name="weight_category" maxLength={30} placeholder="-63 kg" defaultValue={athlete?.weight_category ?? ""} className="input" />
          </Field>
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">{t("trainingTypes")}</legend>
        <div className="flex flex-wrap gap-2">
          {types.map((tt) => (
            <label key={tt.id} className="cursor-pointer">
              <input type="checkbox" name="types" value={tt.id} defaultChecked={selected.includes(tt.id)} className="peer sr-only" />
              <span className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 text-sm peer-checked:border-brand-600 peer-checked:bg-brand-50 peer-checked:font-semibold peer-checked:text-brand-700 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tt.color }} />
                {lang === "fr" ? tt.name_fr : tt.name_ar}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`${t("weeklyTarget")} (${t("optional")})`} htmlFor="weekly_target">
          <input id="weekly_target" name="weekly_target" type="number" min={1} max={21} inputMode="numeric" defaultValue={athlete?.weekly_target ?? ""} className="input" />
        </Field>
        <Field label={t("joinedOn")} htmlFor="joined_on">
          <input id="joined_on" name="joined_on" type="date" defaultValue={athlete?.joined_on ?? ""} className="input" />
        </Field>
      </div>
      {athlete && (
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="active" defaultChecked={athlete.active} className="h-5 w-5" /> {t("active")}
        </label>
      )}
      <SubmitButton>{t("save")}</SubmitButton>
    </ActionForm>
  );
}
