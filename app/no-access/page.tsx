import { getT } from "@/lib/i18n/server";
import { signOut } from "@/app/actions/auth";
import { Logo } from "@/components/Logo";

export default async function NoAccess() {
  const { t } = await getT();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <Logo size={56} />
      <h1 className="text-xl font-bold">{t("noAccessTitle")}</h1>
      <p className="text-slate-600">{t("noAccessBody")}</p>
      <form action={signOut}>
        <button className="btn-secondary">{t("signOut")}</button>
      </form>
    </main>
  );
}
