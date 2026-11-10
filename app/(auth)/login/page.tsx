import Link from "next/link";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { t } = await getT();
  const { next } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(next ?? "/");
  const { data: clubExists } = await supabase.rpc("club_exists");

  return (
    <div className="card p-6">
      <h1 className="text-2xl font-bold">{t("loginTitle")}</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">{t("loginSubtitle")}</p>
      <LoginForm next={next} />
      <p className="mt-6 text-center text-sm text-slate-500">{t("noAccountYet")}</p>
      {clubExists === false && (
        <Link href="/register" className="btn-secondary mt-3 w-full">
          {t("firstSetup")}
        </Link>
      )}
    </div>
  );
}
