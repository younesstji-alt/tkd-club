import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { LangSwitch } from "@/components/LangSwitch";
import { getT } from "@/lib/i18n/server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getT();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo size={36} />
          <span className="font-bold text-slate-800">{t("appName")}</span>
        </div>
        <Suspense>
          <LangSwitch />
        </Suspense>
      </div>
      {children}
    </main>
  );
}
