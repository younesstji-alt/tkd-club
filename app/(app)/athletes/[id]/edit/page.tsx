import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { getTrainingTypes } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { AthleteForm } from "@/components/AthleteForm";
import type { Athlete } from "@/lib/types";

export default async function EditAthletePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const { t } = await getT();
  const [{ data: athlete }, types, { data: links }] = await Promise.all([
    supabase.from("athletes").select("*").eq("id", id).maybeSingle<Athlete>(),
    getTrainingTypes(supabase, true),
    supabase.from("athlete_training_types").select("training_type_id").eq("athlete_id", id),
  ]);
  if (!athlete) notFound();
  const selected = (links ?? []).map((l) => l.training_type_id as string);
  return (
    <>
      <PageHeader title={t("edit")} subtitle={athlete.full_name} back={`/athletes/${id}`} />
      <div className="card">
        <AthleteForm athlete={athlete} types={types.filter((tt) => tt.active || selected.includes(tt.id))} selected={selected} />
      </div>
    </>
  );
}
