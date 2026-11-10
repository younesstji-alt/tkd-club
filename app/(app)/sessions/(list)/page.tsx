import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { getSessionTypeRows, getTrainingTypes } from "@/lib/data";
import { sessionTypeMap } from "@/lib/stats";
import { formatDate, todayISO } from "@/lib/time";
import { Alert, EmptyState, PageHeader } from "@/components/ui";
import { SessionCard } from "@/components/SessionCard";
import type { Session } from "@/lib/types";

export default async function SessionsPage({ searchParams }: { searchParams: Promise<{ tab?: string; created?: string }> }) {
  const { supabase } = await requireStaff();
  const { t, lang } = await getT();
  const sp = await searchParams;
  const tab = sp.tab === "past" ? "past" : "upcoming";
  const today = todayISO();

  let q = supabase.from("sessions").select("*").limit(80);
  q =
    tab === "upcoming"
      ? q.gte("session_date", today).order("session_date").order("start_time")
      : q.lt("session_date", today).order("session_date", { ascending: false }).order("start_time", { ascending: false });
  const [{ data }, types] = await Promise.all([q, getTrainingTypes(supabase, true)]);
  const sessions = (data ?? []) as Session[];
  const ids = sessions.map((s) => s.id);
  const [typeRows, { data: att }] = await Promise.all([
    getSessionTypeRows(supabase, ids),
    ids.length
      ? supabase.from("attendance").select("session_id,status").in("session_id", ids).in("status", ["present", "late"])
      : Promise.resolve({ data: [] as { session_id: string }[] }),
  ]);
  const stMap = sessionTypeMap(typeRows);
  const counts = new Map<string, number>();
  for (const a of att ?? []) counts.set(a.session_id, (counts.get(a.session_id) ?? 0) + 1);
  const typeById = new Map(types.map((tt) => [tt.id, tt]));

  // group by date
  const groups: { date: string; items: Session[] }[] = [];
  for (const s of sessions) {
    const g = groups[groups.length - 1];
    if (g && g.date === s.session_date) g.items.push(s);
    else groups.push({ date: s.session_date, items: [s] });
  }

  return (
    <>
      <PageHeader
        title={t("sessions")}
        action={
          <Link href="/sessions/new" className="btn-primary">
            + {t("newSession")}
          </Link>
        }
      />
      {sp.created && (
        <div className="mb-3">
          <Alert kind="success">{t("sessionsCreated", { n: sp.created })}</Alert>
        </div>
      )}
      <div className="mb-4 grid grid-cols-2 rounded-xl bg-slate-200 p-1 text-sm font-semibold">
        {(["upcoming", "past"] as const).map((k) => (
          <Link
            key={k}
            href={`/sessions?tab=${k}`}
            className={`rounded-lg py-2 text-center ${tab === k ? "bg-white text-slate-900 shadow" : "text-slate-600"}`}
          >
            {t(k)}
          </Link>
        ))}
      </div>
      {groups.length === 0 ? (
        <EmptyState
          icon="📅"
          title={t("noSessions")}
          action={
            <Link href="/sessions/new" className="btn-primary">
              {t("createFirstSession")}
            </Link>
          }
        />
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.date}>
              <h2 className="mb-2 text-sm font-bold text-slate-600">
                {g.date === today ? "● " : ""}
                {formatDate(g.date, lang, { weekday: "long", day: "numeric", month: "long" })}
              </h2>
              <div className="space-y-2">
                {g.items.map((s) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    lang={lang}
                    t={t}
                    showDate={false}
                    href={`/sessions/${s.id}`}
                    types={(stMap.get(s.id) ?? []).map((id) => typeById.get(id)!).filter(Boolean)}
                    right={
                      s.status !== "cancelled" && (counts.get(s.id) ?? 0) > 0 ? (
                        <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
                          {t("checkedInCount", { n: counts.get(s.id) ?? 0 })}
                        </span>
                      ) : null
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
