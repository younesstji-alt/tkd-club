"use client";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { signIn } from "@/app/actions/auth";
import { useI18n } from "@/lib/i18n/client";

export function LoginForm({ next }: { next?: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={signIn}>
      <input type="hidden" name="next" value={next ?? "/"} />
      <Field label={t("email")} htmlFor="email">
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" dir="ltr" required className="input" />
      </Field>
      <Field label={t("password")} htmlFor="password">
        <input id="password" name="password" type="password" autoComplete="current-password" dir="ltr" required className="input" />
      </Field>
      <SubmitButton pendingText={t("loading")}>{t("login")}</SubmitButton>
    </ActionForm>
  );
}
