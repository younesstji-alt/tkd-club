import type { Lang } from "@/lib/i18n/dict";

/** All club dates/times are local to Morocco. */
export const TZ = "Africa/Casablanca";

const locale = (lang: Lang) => (lang === "ar" ? "ar-MA-u-nu-latn" : "fr-MA");

/** Today's date in the club timezone, as YYYY-MM-DD. */
export function todayISO(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Current time in the club timezone, as HH:MM. */
export function nowTimeHM(now = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
}

export function currentMonth(): string {
  return todayISO().slice(0, 7);
}

export function isValidMonth(m: string | undefined | null): m is string {
  return !!m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
}

/** First and last day (inclusive) of a YYYY-MM month. */
export function monthRange(ym: string): { from: string; to: string; days: number } {
  const [y, m] = ym.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${ym}-01`, to: `${ym}-${String(days).padStart(2, "0")}`, days };
}

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function addDays(iso: string, delta: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Monday-based weekday index 0..6 for a YYYY-MM-DD date. */
export function weekdayIndex(iso: string): number {
  return (new Date(iso + "T12:00:00Z").getUTCDay() + 6) % 7;
}

export function formatMonth(ym: string, lang: Lang): string {
  const [y, m] = ym.split("-").map(Number);
  return new Intl.DateTimeFormat(locale(lang), { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 15)),
  );
}

export function formatDate(iso: string, lang: Lang, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat(locale(lang), {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    ...opts,
  }).format(new Date(iso.slice(0, 10) + "T12:00:00Z"));
}

export function formatTime(t: string | null | undefined): string {
  return t ? t.slice(0, 5) : "";
}

export function formatDateTime(ts: string | null | undefined, lang: Lang): string {
  if (!ts) return "";
  return new Intl.DateTimeFormat(locale(lang), {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: TZ,
  }).format(new Date(ts));
}

export function formatClock(ts: string | null | undefined): string {
  if (!ts) return "";
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TZ }).format(
    new Date(ts),
  );
}

/** Offset (ms) of TZ from UTC at a given instant. */
function tzOffsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUTC - at.getTime();
}

/** Convert a local club date + time (HH:MM[:SS]) to a real instant. */
export function zonedToDate(dateISO: string, time: string): Date {
  const [y, mo, d] = dateISO.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const off1 = tzOffsetMs(new Date(guess));
  const result = guess - off1;
  const off2 = tzOffsetMs(new Date(result));
  return new Date(off1 === off2 ? result : guess - off2);
}

export function age(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const today = todayISO();
  let a = Number(today.slice(0, 4)) - Number(dob.slice(0, 4));
  if (today.slice(5) < dob.slice(5, 10)) a -= 1;
  return a;
}
