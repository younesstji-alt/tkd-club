"use client";
import { useState } from "react";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { createInvite } from "@/app/actions/athletes";
import { useI18n } from "@/lib/i18n/client";
import type { ActionState, Role } from "@/lib/types";

export function InviteLink({ link }: { link: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2 rounded-xl border border-green-200 bg-green-50 p-3">
      <div className="text-xs font-semibold text-green-800">{t("inviteLink")}</div>
      <input readOnly value={link} dir="ltr" className="input text-xs" onFocus={(e) => e.currentTarget.select()} />
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-secondary flex-1"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {}
          }}
        >
          {copied ? t("copied") : t("copy")}
        </button>
        <a className="btn-secondary flex-1" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(link)}`}>
          {t("shareWhatsapp")}
        </a>
      </div>
    </div>
  );
}

export function InviteBox({
  athleteId,
  athleteName,
  roles = ["athlete"],
  athletes,
}: {
  athleteId?: string;
  athleteName?: string;
  roles?: Role[];
  athletes?: { id: string; name: string }[];
}) {
  const { t } = useI18n();
  const [link, setLink] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(roles[0]);
  return (
    <div className="space-y-3">
      <ActionForm
        action={createInvite}
        resetOnSuccess
        onSuccess={(s: ActionState) => setLink((s?.data?.link as string) ?? null)}
      >
        {athleteId && <input type="hidden" name="athlete_id" value={athleteId} />}
        {athleteName && <input type="hidden" name="full_name" value={athleteName} />}
        <Field label={t("email")} htmlFor="invite_email">
          <input id="invite_email" name="email" type="email" required dir="ltr" className="input" />
        </Field>
        {roles.length > 1 ? (
          <Field label={t("role")} htmlFor="invite_role">
            <select id="invite_role" name="role" value={role} onChange={(e) => setRole(e.target.value as Role)} className="input">
              {roles.map((r) => (
                <option key={r} value={r}>
                  {t(`role_${r}`)}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <input type="hidden" name="role" value={roles[0]} />
        )}
        {!athleteId && (
          <Field label={t("fullName")} htmlFor="invite_name">
            <input id="invite_name" name="full_name" maxLength={120} className="input" />
          </Field>
        )}
        {!athleteId && role === "athlete" && athletes && athletes.length > 0 && (
          <Field label={t("linkToAthlete")} htmlFor="invite_athlete">
            <select id="invite_athlete" name="athlete_id" className="input" defaultValue="">
              <option value="">{t("newAthleteProfile")}</option>
              {athletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <SubmitButton>{t("invite")}</SubmitButton>
      </ActionForm>
      {link && <InviteLink link={link} />}
    </div>
  );
}
