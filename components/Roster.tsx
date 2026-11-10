"use client";
import { useEffect, useState } from "react";
import { setAttendance } from "@/app/actions/sessions";
import { useI18n } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dict";
import { ATTENDANCE_STATUSES, type AttendanceStatus } from "@/lib/types";
import { formatClock } from "@/lib/time";
import { Alert, AttendanceBadge, Avatar } from "./ui";

export interface RosterRow {
  athlete_id: string;
  name: string;
  photo?: string | null;
  status: AttendanceStatus | null; // recorded
  effective: AttendanceStatus | null;
  method: "self" | "manual" | null;
  checked_in_at: string | null;
  note: string | null;
}

const BTN: Record<AttendanceStatus, string> = {
  present: "aria-pressed:bg-green-600 aria-pressed:text-white aria-pressed:border-green-600",
  late: "aria-pressed:bg-amber-500 aria-pressed:text-white aria-pressed:border-amber-500",
  absent: "aria-pressed:bg-red-600 aria-pressed:text-white aria-pressed:border-red-600",
  excused: "aria-pressed:bg-sky-600 aria-pressed:text-white aria-pressed:border-sky-600",
};

export function Roster({
  sessionId,
  rows,
  others,
  disabled,
}: {
  sessionId: string;
  rows: RosterRow[];
  others: { id: string; name: string }[];
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [local, setLocal] = useState<Record<string, { status: AttendanceStatus | null; note: string | null }>>({});
  const [addId, setAddId] = useState("");
  // fresh server rows replace local overrides
  useEffect(() => setLocal({}), [rows]);
  const view = rows.map((r) =>
    local[r.athlete_id]
      ? {
          ...r,
          status: local[r.athlete_id].status,
          effective: local[r.athlete_id].status ?? r.effective,
          method: local[r.athlete_id].status ? ("manual" as const) : r.method,
          note: local[r.athlete_id].note,
        }
      : r,
  );

  async function apply(athleteId: string, status: AttendanceStatus | null) {
    setBusy(athleteId);
    setError(null);
    try {
      const res = await setAttendance({ sessionId, athleteId, status, note });
      if (!res.ok) setError(t((res.error ?? "genericError") as DictKey));
      else {
        setNote("");
        // show the new status immediately; the action's revalidation brings fresh server data
        setLocal((m) => ({ ...m, [athleteId]: { status, note: note.trim() || null } }));
      }
    } catch {
      setError(t("networkError"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && <Alert>{error}</Alert>}
      {!disabled && (
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("changeReason")}
          maxLength={300}
          className="input"
          aria-label={t("changeReason")}
        />
      )}
      {rows.length === 0 && <p className="card text-sm text-slate-500">{t("noExpected")}</p>}
      <ul className="space-y-2">
        {view.map((r) => (
          <li key={r.athlete_id} className={`card p-3 ${busy === r.athlete_id ? "opacity-60" : ""}`}>
            <div className="flex items-center gap-3">
              <Avatar name={r.name} url={r.photo} size={36} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{r.name}</div>
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                  <AttendanceBadge status={r.effective} t={t} />
                  {r.checked_in_at && <span dir="ltr">{formatClock(r.checked_in_at)}</span>}
                  {r.method && <span>{t(r.method === "self" ? "method_self" : "method_manual")}</span>}
                  {r.note && <span className="truncate">· {r.note}</span>}
                </div>
              </div>
            </div>
            {!disabled && (
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {ATTENDANCE_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busy !== null}
                    aria-pressed={r.status === s}
                    onClick={() => apply(r.athlete_id, r.status === s ? null : s)}
                    title={r.status === s ? t("clearRecord") : undefined}
                    className={`min-h-10 rounded-lg border border-slate-300 bg-white px-1 text-xs font-semibold text-slate-700 ${BTN[s]}`}
                  >
                    {t(`att_${s}` as DictKey)}
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
      {!disabled && others.length > 0 && (
        <div className="card flex gap-2 p-3">
          <select value={addId} onChange={(e) => setAddId(e.target.value)} className="input flex-1" aria-label={t("addAthleteToSession")}>
            <option value="">{t("addAthleteToSession")}…</option>
            {others.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-secondary"
            disabled={!addId || busy !== null}
            onClick={() => {
              apply(addId, "present");
              setAddId("");
            }}
          >
            {t("add")}
          </button>
        </div>
      )}
    </div>
  );
}
