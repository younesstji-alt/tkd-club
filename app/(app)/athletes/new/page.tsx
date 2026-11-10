import { requireStaff } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { getTrainingTypes } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { AthleteForm } from "@/components/AthleteForm";

export default async function NewAthletePage() {
  const { supabase } = await requireStaff();
  const { t } = await getT();
  const types = await getTrainingTypes(supabase);
  return (
    <>
      <PageHeader title={t("newAthlete")} back="/athletes" />
      <div className="card">
        <AthleteForm types={types} />
      </div>
    </>
  );
}
