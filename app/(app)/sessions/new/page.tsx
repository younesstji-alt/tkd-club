import { requireStaff } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { getTrainingTypes } from "@/lib/data";
import { todayISO } from "@/lib/time";
import { PageHeader } from "@/components/ui";
import { SessionForm } from "@/components/SessionForm";
import { createSession } from "@/app/actions/sessions";

export default async function NewSessionPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { supabase } = await requireStaff();
  const { t } = await getT();
  const { date } = await searchParams;
  const types = await getTrainingTypes(supabase);
  return (
    <>
      <PageHeader title={t("newSession")} back="/sessions" />
      <div className="card">
        <SessionForm action={createSession} types={types} defaultDate={date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayISO()} />
      </div>
    </>
  );
}
