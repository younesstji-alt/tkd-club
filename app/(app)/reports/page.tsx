import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { buildMonthlyReport } from "@/lib/report";
import { typeName } from "@/lib/data";
import { currentMonth, formatDateTime, formatMonth, isValidMonth } from "@/lib/time";
import { EmptyState, PageHeader, RateBar, SectionTitle, Stat } from "@/components/ui";
import { PrintButton } from "@/components/PrintButton";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ month?: string; athlete?: string; type?: string }> }) {
  const sp = await searchParams;
  const month = isValidMonth(sp.month) ? sp.month : currentMonth();
  const { supabase, club } = await requireStaff();
  const { t, lang } = await getT();
  const report = await buildMonthlyReport(supabase, { month, athleteId: sp.athlete || undefined, typeId: sp.type || undefined });
  const qs = new URLSearchParams({ month, ...(sp.athlete ? { athlete: sp.athlete } : {}), ...(sp.type ? { type: sp.type } : {}) });
  const c = report.totals;
  const selectedType = report.types.find((tt) => tt.id === sp.type);

  return (
    <>
      <PageHeader title={t("reports")} subtitle={formatMonth(month, lang)} />
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">
          {club.name} — {t("reportFor", { month: formatMonth(month, lang) })}
        </h1>
        <p className="text-xs text-slate-500">
          {selectedType ? `${typeName(selectedType, lang)} · ` : ""}
          {t("generatedOn", { date: formatDateTime(new Date().toISOString(), lang) })}
        </p>
      </div>

      <form className="no-print card mb-4 grid grid-cols-2 gap-3" method="get">
        <label className="col-span-2 sm:col-span-1">
          <span className="label">{t("month")}</span>
          <input type="month" name="month" defaultValue={month} max={currentMonth()} className="input" />
        </label>
        <label className="col-span-2 sm:col-span-1">
          <span className="label">{t("trainingType")}</span>
          <select name="type" defaultValue={sp.type ?? ""} className="input">
            <option value="">{t("all")}</option>
            {report.types.map((tt) => (
              <option key={tt.id} value={tt.id}>
                {typeName(tt, lang)}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2">
          <span className="label">{t("athlete")}</span>
          <select name="athlete" defaultValue={sp.athlete ?? ""} className="input">
            <option value="">{t("all")}</option>
            {report.athletes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name}
              </option>
            ))}
          </select>
        </label>
        <button className="btn-primary col-span-2">{t("apply")}</button>
      </form>

      <div className="no-print mb-4 flex gap-2">
        <a href={`/reports/export?${qs}`} className="btn-secondary flex-1">
          ⬇ {t("exportCsv")}
        </a>
        <PrintButton />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label={t("attendanceRate")} value={c.rate === null ? "—" : `${c.rate}%`} />
        <Stat label={t("sessionsThisMonth")} value={report.sessionCounts.held} hint={report.sessionCounts.cancelled ? `${t("status_cancelled")}: ${report.sessionCounts.cancelled}` : undefined} />
        <Stat label={t("att_present")} value={c.present} tone="text-green-700" hint={`${t("att_late")}: ${c.late}`} />
        <Stat label={t("att_absent")} value={c.absent} tone="text-red-600" hint={`${t("att_excused")}: ${c.excused}`} />
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        {t("rateHint")} {t("cancelledExcluded")}
      </p>

      {report.byType.length > 0 && !sp.type && (
        <>
          <SectionTitle>{t("byType")}</SectionTitle>
          <div className="card divide-y divide-slate-100 p-0">
            {report.byType.map(({ type, counts }) => (
              <div key={type.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: type.color }} />
                <span className="w-32 shrink-0 truncate font-medium">{typeName(type, lang)}</span>
                <RateBar rate={counts.rate} />
                <span className="w-12 shrink-0 text-end font-bold">{counts.rate === null ? "—" : `${counts.rate}%`}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionTitle>{t("athletes")}</SectionTitle>
      {report.list.length === 0 ? (
        <EmptyState icon="📊" title={t("noData")} />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 text-start">{t("athlete")}</th>
                <th className="px-1 py-2">{t("expected")}</th>
                <th className="px-1 py-2 text-green-700">{t("att_present")}</th>
                <th className="px-1 py-2 text-amber-600">{t("att_late")}</th>
                <th className="px-1 py-2 text-red-600">{t("att_absent")}</th>
                <th className="px-1 py-2 text-sky-700">{t("att_excused")}</th>
                <th className="px-3 py-2 text-end">{t("rate")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.list.map((r) => (
                <tr key={r.athlete_id}>
                  <td className="px-3 py-2">
                    <Link href={`/athletes/${r.athlete_id}?month=${month}`} className="font-medium hover:underline">
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-1 py-2 text-center">{r.counts.expected}</td>
                  <td className="px-1 py-2 text-center">{r.counts.present}</td>
                  <td className="px-1 py-2 text-center">{r.counts.late}</td>
                  <td className="px-1 py-2 text-center">{r.counts.absent}</td>
                  <td className="px-1 py-2 text-center">{r.counts.excused}</td>
                  <td className="px-3 py-2 text-end font-bold">{r.counts.rate === null ? "—" : `${r.counts.rate}%`}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold">
              <tr>
                <td className="px-3 py-2">{t("clubTotals")}</td>
                <td className="px-1 py-2 text-center">{c.expected}</td>
                <td className="px-1 py-2 text-center">{c.present}</td>
                <td className="px-1 py-2 text-center">{c.late}</td>
                <td className="px-1 py-2 text-center">{c.absent}</td>
                <td className="px-1 py-2 text-center">{c.excused}</td>
                <td className="px-3 py-2 text-end">{c.rate === null ? "—" : `${c.rate}%`}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}
