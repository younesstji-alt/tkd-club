import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { getExpectedRows, getTrainingTypes, photoUrls, typeName } from "@/lib/data";
import { countRows, groupBy } from "@/lib/stats";
import { currentMonth, monthRange } from "@/lib/time";
import { Avatar, EmptyState, PageHeader, RateBar } from "@/components/ui";
import type { Athlete } from "@/lib/types";

export default async function AthletesPage({ searchParams }: { searchParams: Promise<{ q?: string; show?: string }> }) {
  const { supabase } = await requireStaff();
  const { t, lang } = await getT();
  const { q, show } = await searchParams;
  let query = supabase.from("athletes").select("*, athlete_training_types(training_type_id)").order("full_name");
  if (show !== "all") query = query.eq("active", true);
  if (q) query = query.ilike("full_name", `%${q.replace(/[%_]/g, "")}%`);
  const { from, to } = monthRange(currentMonth());
  const [{ data }, types, rows] = await Promise.all([query, getTrainingTypes(supabase, true), getExpectedRows(supabase, { from, to })]);
  const athletes = (data ?? []) as (Athlete & { athlete_training_types: { training_type_id: string }[] })[];
  const photos = await photoUrls(supabase, athletes);
  const byAthlete = groupBy(rows, (r) => r.athlete_id);
  const typeById = new Map(types.map((tt) => [tt.id, tt]));

  return (
    <>
      <PageHeader
        title={t("athletes")}
        subtitle={`${athletes.length}`}
        action={
          <Link href="/athletes/new" className="btn-primary">
            + {t("newAthlete")}
          </Link>
        }
      />
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder={t("searchAthletes")} className="input flex-1" type="search" />
        <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-600">
          <input type="checkbox" name="show" value="all" defaultChecked={show === "all"} className="h-4 w-4" />
          {t("inactive")}
        </label>
        <button className="btn-secondary">{t("search")}</button>
      </form>
      {athletes.length === 0 ? (
        <EmptyState
          title={t("noAthletes")}
          action={
            !q && (
              <Link href="/athletes/new" className="btn-primary">
                {t("addFirstAthlete")}
              </Link>
            )
          }
        />
      ) : (
        <ul className="space-y-2">
          {athletes.map((a) => {
            const c = countRows(byAthlete.get(a.id) ?? []);
            return (
              <li key={a.id}>
                <Link href={`/athletes/${a.id}`} className={`card flex items-center gap-3 p-3 hover:border-brand-500 ${a.active ? "" : "opacity-60"}`}>
                  <Avatar name={a.full_name} url={photos.get(a.id)} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold">{a.full_name}</span>
                      {!a.active && <span className="text-xs text-slate-500">({t("inactive")})</span>}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {[a.belt, a.weight_category, ...a.athlete_training_types.map((x) => typeById.get(x.training_type_id)).filter(Boolean).map((tt) => typeName(tt!, lang))]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <RateBar rate={c.rate} />
                      <span className="w-10 shrink-0 text-end text-xs font-bold text-slate-700">{c.rate === null ? "—" : `${c.rate}%`}</span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
