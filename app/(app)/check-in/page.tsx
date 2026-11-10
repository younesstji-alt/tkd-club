import { requireMember } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { Alert, PageHeader } from "@/components/ui";
import { CheckInForm } from "@/components/CheckInForm";

export default async function CheckInPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { profile } = await requireMember();
  const { t } = await getT();
  const { code } = await searchParams;
  return (
    <>
      <PageHeader title={t("checkInTitle")} />
      {profile.role === "athlete" ? <CheckInForm initialCode={code} /> : <Alert kind="info">{t("ci_not_athlete")}</Alert>}
    </>
  );
}
