import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { Alert } from "@/components/ui";
import { InviteAccept, InviteSignUp } from "./InviteForms";
import type { Role } from "@/lib/types";

type Info = { email: string; role: Role; full_name: string | null; club_name: string; expired: boolean; accepted: boolean } | null;

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { t } = await getT();
  const supabase = await createClient();
  const { data } = await supabase.rpc("invitation_info", { p_token: token });
  const info = data as Info;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let body: React.ReactNode;
  if (!info) body = <Alert>{t("inviteInvalid")}</Alert>;
  else if (info.accepted) body = <Alert kind="info">{t("inviteUsed")}</Alert>;
  else if (info.expired) body = <Alert>{t("inviteExpired")}</Alert>;
  else if (user) body = <InviteAccept token={token} />;
  else
    body = (
      <>
        <InviteSignUp token={token} email={info.email} fullName={info.full_name} />
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link className="text-brand-600 underline" href={`/login?next=/invite/${token}`}>
            {t("haveAccount")}
          </Link>
        </p>
      </>
    );

  return (
    <div className="card p-6">
      <h1 className="text-2xl font-bold">{t("inviteTitle")}</h1>
      {info && (
        <p className="mb-6 mt-1 text-sm text-slate-600">
          {t("inviteFor", { club: info.club_name, role: t(`role_${info.role}`) })}
        </p>
      )}
      {body}
    </div>
  );
}
