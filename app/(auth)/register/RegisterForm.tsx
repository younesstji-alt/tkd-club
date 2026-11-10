"use client";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { registerClub } from "@/app/actions/auth";
import { useI18n } from "@/lib/i18n/client";

export function RegisterForm() {
  const { t } = useI18n();
  return (
    <ActionForm action={registerClub}>
      <Field label={t("clubName")} htmlFor="club_name">
        <input id="club_name" name="club_name" required maxLength={120} className="input" />
      </Field>
      <Field label={t("fullName")} htmlFor="full_name">
        <input id="full_name" name="full_name" required maxLength={120} autoComplete="name" className="input" />
      </Field>
      <Field label={t("email")} htmlFor="email">
        <input id="email" name="email" type="email" required autoComplete="email" dir="ltr" className="input" />
      </Field>
      <Field label={t("password")} hint={t("passwordHint")} htmlFor="password">
        <input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" dir="ltr" className="input" />
      </Field>
      <SubmitButton>{t("createClub")}</SubmitButton>
    </ActionForm>
  );
}
