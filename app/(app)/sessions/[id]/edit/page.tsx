import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { getTrainingTypes } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { SessionForm } from "@/components/SessionForm";
import { updateSession } from "@/app/actions/sessions";
import type { Session } from "@/lib/types";

export default async function EditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const { t } = await getT();
  const [{ data: session }, types, { data: links }] = await Promise.all([
    supabase.from("sessions").select("*").eq("id", id).maybeSingle<Session>(),
    getTrainingTypes(supabase, true),
    supabase.from("session_training_types").select("training_type_id").eq("session_id", id),
  ]);
  if (!session) notFound();
  const selected = (links ?? []).map((l) => l.training_type_id as string);
  const usable = types.filter((tt) => tt.active || selected.includes(tt.id));
  return (
    <>
      <PageHeader title={t("edit")} back={`/sessions/${id}`} />
      <div className="card">
        <SessionForm
          action={updateSession}
          types={usable}
          session={session}
          selectedTypes={selected}
          defaultDate={session.session_date}
        />
      </div>
    </>
  );
}
