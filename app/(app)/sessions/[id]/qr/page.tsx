import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { getOrigin } from "@/lib/origin";
import { formatClock, formatDate, formatTime, zonedToDate } from "@/lib/time";
import { PageHeader, Stat } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { QrDisplay } from "@/components/QrDisplay";
import { regenerateCode } from "@/app/actions/sessions";
import type { Session } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function QrPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, club } = await requireStaff();
  const { t, lang } = await getT();
  const [{ data: session }, { data: codeRow }, { data: att }] = await Promise.all([
    supabase.from("sessions").select("*").eq("id", id).maybeSingle<Session>(),
    supabase.from("session_codes").select("code").eq("session_id", id).maybeSingle(),
    supabase.from("attendance").select("status").eq("session_id", id),
  ]);
  if (!session || !codeRow) notFound();

  const start = zonedToDate(session.session_date, session.start_time);
  const opens = new Date(start.getTime() - club.checkin_opens_before_min * 60000);
  const closes = new Date(start.getTime() + club.checkin_closes_after_min * 60000);
  const now = Date.now();
  const open = session.status !== "cancelled" && now >= opens.getTime() && now <= closes.getTime();
  const url = `${await getOrigin()}/check-in?code=${codeRow.code}`;
  const present = (att ?? []).filter((a) => a.status === "present").length;
  const late = (att ?? []).filter((a) => a.status === "late").length;

  return (
    <>
      <PageHeader
        title={t("qrTitle")}
        subtitle={
          <>
            {formatDate(session.session_date, lang)} · <span dir="ltr">{formatTime(session.start_time)}–{formatTime(session.end_time)}</span>
          </>
        }
        back={`/sessions/${id}`}
      />
      <QrDisplay url={url} code={codeRow.code} open={open} />
      <p className="mt-3 text-center text-sm text-slate-600">
        {t("qrWindow", { from: formatClock(opens.toISOString()), to: formatClock(closes.toISOString()) })}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Stat label={t("att_present")} value={present} tone="text-green-700" />
        <Stat label={t("att_late")} value={late} tone="text-amber-600" />
      </div>
      <form action={regenerateCode} className="no-print mt-6">
        <input type="hidden" name="id" value={id} />
        <SubmitButton className="btn-ghost w-full" confirm={t("qrConfirmNewCode")}>
          ↻ {t("qrNewCode")}
        </SubmitButton>
      </form>
    </>
  );
}
