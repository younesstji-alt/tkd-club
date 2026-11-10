"use client";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { acceptInvite, signUpWithInvite } from "@/app/actions/auth";
import { useI18n } from "@/lib/i18n/client";

export function InviteSignUp({ token, email, fullName }: { token: string; email: string; fullName?: string | null }) {
  const { t } = useI18n();
  return (
    <ActionForm action={signUpWithInvite}>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="email" value={email} />
      <Field label={t("email")}>
        <input value={email} readOnly disabled dir="ltr" className="input" />
      </Field>
      <Field label={t("fullName")} htmlFor="full_name">
        <input id="full_name" name="full_name" defaultValue={fullName ?? ""} required maxLength={120} className="input" />
      </Field>
      <Field label={t("password")} hint={t("passwordHint")} htmlFor="password">
        <input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" dir="ltr" className="input" />
      </Field>
      <SubmitButton>{t("createAccount")}</SubmitButton>
    </ActionForm>
  );
}

export function InviteAccept({ token }: { token: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={acceptInvite}>
      <input type="hidden" name="token" value={token} />
      <SubmitButton>{t("acceptInvite")}</SubmitButton>
    </ActionForm>
  );
}
