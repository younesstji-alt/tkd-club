import Link from "next/link";
import type { AttendanceStatus, SessionStatus } from "@/lib/types";
import type { T } from "@/lib/i18n/dict";

export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: React.ReactNode;
  back?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      {back && (
        <Link href={back} className="no-print -ms-2 rounded-full p-2 text-slate-500 hover:bg-slate-200" aria-label="back">
          <svg viewBox="0 0 24 24" className="h-5 w-5 rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <div className="mt-0.5 text-sm text-slate-500">{subtitle}</div>}
      </div>
      {action && <div className="no-print shrink-0">{action}</div>}
    </div>
  );
}

export function EmptyState({ icon = "🥋", title, action }: { icon?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 py-10 text-center">
      <div className="text-4xl" aria-hidden>
        {icon}
      </div>
      <p className="max-w-xs text-slate-600">{title}</p>
      {action}
    </div>
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "success" | "info"; children: React.ReactNode }) {
  const cls =
    kind === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : kind === "success"
        ? "border-green-200 bg-green-50 text-green-800"
        : "border-blue-200 bg-blue-50 text-blue-800";
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-xl border px-3 py-2.5 text-sm ${cls}`}>
      {children}
    </div>
  );
}

const ATT_CLS: Record<AttendanceStatus | "pending", string> = {
  present: "bg-green-100 text-green-800",
  late: "bg-amber-100 text-amber-800",
  absent: "bg-red-100 text-red-800",
  excused: "bg-sky-100 text-sky-800",
  pending: "bg-slate-100 text-slate-600",
};
export const ATT_DOT: Record<AttendanceStatus | "pending", string> = {
  present: "bg-green-500",
  late: "bg-amber-500",
  absent: "bg-red-500",
  excused: "bg-sky-500",
  pending: "bg-slate-300",
};

export function AttendanceBadge({ status, t }: { status: AttendanceStatus | null; t: T }) {
  const s = status ?? "pending";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${ATT_CLS[s]}`}>
      {t(`att_${s}` as "att_present")}
    </span>
  );
}

const SESSION_CLS: Record<SessionStatus, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  completed: "bg-slate-200 text-slate-700",
  cancelled: "bg-red-100 text-red-700 line-through",
};
export function SessionStatusBadge({ status, t }: { status: SessionStatus; t: T }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${SESSION_CLS[status]}`}>
      {t(`status_${status}` as "status_scheduled")}
    </span>
  );
}

export function TypeChip({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
      style={{ borderColor: color + "55", color, backgroundColor: color + "12" }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </span>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: string }) {
  return (
    <div className="card p-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tone ?? "text-slate-900"}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700"
      style={{ width: size, height: size, fontSize: size / 2.6 }}
      aria-hidden
    >
      {initials}
    </div>
  );
}

export function RateBar({ rate }: { rate: number | null }) {
  const v = rate ?? 0;
  const color = rate === null ? "bg-slate-300" : v >= 80 ? "bg-green-500" : v >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${v}%` }} />
    </div>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between gap-2">
      <h2 className="text-base font-bold text-slate-800">{children}</h2>
      {action}
    </div>
  );
}
