import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { Alert } from "@/components/ui";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const { data: exists } = await supabase.rpc("club_exists");
  return (
    <div className="card p-6">
      <h1 className="text-2xl font-bold">{t("registerTitle")}</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">{t("registerSubtitle")}</p>
      {exists ? (
        <div className="space-y-4">
          <Alert kind="info">{t("clubAlreadyExists")}</Alert>
          <Link href="/login" className="btn-primary w-full">
            {t("login")}
          </Link>
        </div>
      ) : (
        <RegisterForm />
      )}
    </div>
  );
}
