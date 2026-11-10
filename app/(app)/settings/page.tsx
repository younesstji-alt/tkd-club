import Link from "next/link";
import { Suspense } from "react";
import { requireStaff } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { getTrainingTypes } from "@/lib/data";
import { PageHeader, SectionTitle } from "@/components/ui";
import { LangSwitch } from "@/components/LangSwitch";
import { AddTypeForm, ClubForm, TypeRow } from "@/components/SettingsForms";
import { signOut } from "@/app/actions/auth";

export default async function SettingsPage() {
  const { supabase, club, profile } = await requireStaff();
  const { t } = await getT();
  const types = await getTrainingTypes(supabase, true);
  const isAdmin = profile.role === "admin";
  return (
    <>
      <PageHeader title={t("settings")} />

      <div className="card flex items-center justify-between">
        <span className="font-medium">{t("myLanguage")}</span>
        <Suspense>
          <LangSwitch />
        </Suspense>
      </div>

      {isAdmin && (
        <Link href="/settings/members" className="card mt-3 flex items-center justify-between hover:border-brand-500">
          <span className="font-medium">👥 {t("members")}</span>
          <span className="text-slate-400 rtl:rotate-180">›</span>
        </Link>
      )}

      <SectionTitle>{t("clubSettings")}</SectionTitle>
      <div className="card">
        {!isAdmin && <p className="mb-3 text-xs text-slate-500">{t("adminOnly")}</p>}
        <ClubForm club={club} readOnly={!isAdmin} />
      </div>

      <SectionTitle>{t("classTypes")}</SectionTitle>
      <div className="card divide-y divide-slate-100 py-1">
        {types.map((tt) => (
          <TypeRow key={tt.id} tt={tt} />
        ))}
        <AddTypeForm />
      </div>

      <form action={signOut} className="mt-8">
        <button className="btn-secondary w-full">{t("signOut")}</button>
      </form>
    </>
  );
}
