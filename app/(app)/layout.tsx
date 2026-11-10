import { Suspense } from "react";
import { requireMember } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { BottomNav } from "@/components/BottomNav";
import { LangSwitch } from "@/components/LangSwitch";
import { Logo } from "@/components/Logo";
import { signOut } from "@/app/actions/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, club } = await requireMember();
  const { t } = await getT();
  return (
    <div className="min-h-dvh">
      <header className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-2.5">
          <Logo size={30} />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-bold text-slate-900">{club.name}</div>
            <div className="truncate text-xs text-slate-500">
              {profile.full_name} · {t(`role_${profile.role}`)}
            </div>
          </div>
          <Suspense>
            <LangSwitch />
          </Suspense>
          <form action={signOut}>
            <button className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label={t("signOut")} title={t("signOut")}>
              <svg viewBox="0 0 24 24" className="h-5 w-5 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M15 4h4v16h-4M10 17l5-5-5-5M15 12H3" />
              </svg>
            </button>
          </form>
        </div>
      </header>
      <main className="pb-safe mx-auto max-w-2xl px-4 pt-4">{children}</main>
      <BottomNav role={profile.role} />
    </div>
  );
}
