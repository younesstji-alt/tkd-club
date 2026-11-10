import Link from "next/link";
import type { Lang, T } from "@/lib/i18n/dict";
import type { Session, TrainingType } from "@/lib/types";
import { formatDate, formatTime } from "@/lib/time";
import { typeName } from "@/lib/data";
import { SessionStatusBadge, TypeChip } from "./ui";

export function SessionCard({
  session,
  types,
  lang,
  t,
  href,
  right,
  showDate = true,
}: {
  session: Session;
  types: TrainingType[];
  lang: Lang;
  t: T;
  href: string;
  right?: React.ReactNode;
  showDate?: boolean;
}) {
  return (
    <Link href={href} className={`card block transition hover:border-brand-500 ${session.status === "cancelled" ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-900" dir="ltr">
              {formatTime(session.start_time)}–{formatTime(session.end_time)}
            </span>
            {showDate && <span className="text-sm text-slate-600">{formatDate(session.session_date, lang)}</span>}
            {session.status !== "scheduled" && <SessionStatusBadge status={session.status} t={t} />}
          </div>
          {session.location && <div className="mt-0.5 truncate text-sm text-slate-500">📍 {session.location}</div>}
          {types.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {types.map((tt) => (
                <TypeChip key={tt.id} name={typeName(tt, lang)} color={tt.color} />
              ))}
            </div>
          )}
        </div>
        {right}
      </div>
    </Link>
  );
}
