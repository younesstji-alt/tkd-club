"use client";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { addTrainingType, saveClub, setMember, updateTrainingType } from "@/app/actions/settings";
import { useI18n } from "@/lib/i18n/client";
import type { Club, Profile, TrainingType } from "@/lib/types";

export function ClubForm({ club, readOnly }: { club: Club; readOnly: boolean }) {
  const { t } = useI18n();
  return (
    <ActionForm action={saveClub}>
      <input type="hidden" name="id" value={club.id} />
      <fieldset disabled={readOnly} className="space-y-4">
        <Field label={t("clubName")} htmlFor="name">
          <input id="name" name="name" required maxLength={120} defaultValue={club.name} className="input" />
        </Field>
        <div>
          <div className="label">{t("checkinWindow")}</div>
          <div className="grid grid-cols-3 gap-2">
            <Field label={t("opensBefore")} htmlFor="ob">
              <input id="ob" name="checkin_opens_before_min" type="number" min={0} max={720} defaultValue={club.checkin_opens_before_min} className="input" />
            </Field>
            <Field label={t("closesAfter")} htmlFor="ca">
              <input id="ca" name="checkin_closes_after_min" type="number" min={0} max={720} defaultValue={club.checkin_closes_after_min} className="input" />
            </Field>
            <Field label={t("lateAfter")} htmlFor="la">
              <input id="la" name="late_after_min" type="number" min={0} max={720} defaultValue={club.late_after_min} className="input" />
            </Field>
          </div>
        </div>
        <Field label={t("defaultLanguage")} htmlFor="dl">
          <select id="dl" name="default_language" defaultValue={club.default_language} className="input">
            <option value="ar">العربية</option>
            <option value="fr">Français</option>
          </select>
        </Field>
        <Field label={t("timezone")}>
          <input value={club.timezone} readOnly disabled dir="ltr" className="input" />
        </Field>
        {!readOnly && <SubmitButton>{t("save")}</SubmitButton>}
      </fieldset>
    </ActionForm>
  );
}

export function TypeRow({ tt }: { tt: TrainingType }) {
  const { t } = useI18n();
  return (
    <ActionForm action={updateTrainingType} className="space-y-2 py-3">
      <input type="hidden" name="id" value={tt.id} />
      <div className="flex items-center gap-2">
        <input type="color" name="color" defaultValue={tt.color} className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-slate-300" aria-label={t("color")} />
        <input name="name_ar" defaultValue={tt.name_ar} required dir="rtl" aria-label={t("nameAr")} className="input" />
        <input name="name_fr" defaultValue={tt.name_fr} required dir="ltr" aria-label={t("nameFr")} className="input" />
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={tt.active} className="h-4 w-4" /> {t("active")}
        </label>
        <SubmitButton className="btn-secondary">{t("save")}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function AddTypeForm() {
  const { t } = useI18n();
  return (
    <ActionForm action={addTrainingType} resetOnSuccess className="space-y-2 pt-3">
      <div className="flex items-center gap-2">
        <input type="color" name="color" defaultValue="#7c3aed" className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-slate-300" aria-label={t("color")} />
        <input name="name_ar" required dir="rtl" placeholder={t("nameAr")} className="input" />
        <input name="name_fr" dir="ltr" placeholder={t("nameFr")} className="input" />
      </div>
      <SubmitButton className="btn-primary w-full">+ {t("addType")}</SubmitButton>
    </ActionForm>
  );
}

export function MemberRow({ member, isSelf }: { member: Profile; isSelf: boolean }) {
  const { t } = useI18n();
  const roles = member.role === "athlete" ? (["athlete"] as const) : (["admin", "coach"] as const);
  return (
    <ActionForm action={setMember} className="space-y-2 py-3">
      <input type="hidden" name="id" value={member.id} />
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{member.full_name}</div>
          <div className="truncate text-xs text-slate-500" dir="ltr">
            {member.email}
          </div>
        </div>
        {isSelf ? (
          <span className="text-xs text-slate-500">{t(`role_${member.role}`)}</span>
        ) : (
          <div className="flex items-center gap-2">
            <select name="role" defaultValue={member.role} className="input w-auto py-1.5 text-sm" disabled={roles.length === 1}>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {t(`role_${r}`)}
                </option>
              ))}
            </select>
            {roles.length === 1 && <input type="hidden" name="role" value={member.role} />}
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" name="active" defaultChecked={member.active} className="h-4 w-4" /> {t("active")}
            </label>
            <SubmitButton className="btn-secondary px-3">{t("save")}</SubmitButton>
          </div>
        )}
      </div>
    </ActionForm>
  );
}
