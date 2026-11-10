import Link from "next/link";
import type { Lang } from "@/lib/i18n/dict";
import { currentMonth, formatMonth, shiftMonth } from "@/lib/time";

export function MonthNav({ month, lang, hrefFor }: { month: string; lang: Lang; hrefFor: (m: string) => string }) {
  const next = shiftMonth(month, 1);
  const canNext = next <= currentMonth();
  return (
    <div className="no-print flex items-center justify-between rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
      <Link href={hrefFor(shiftMonth(month, -1))} className="rounded-lg px-3 py-2 text-lg text-slate-600 hover:bg-slate-100" aria-label="previous month">
        <span className="inline-block rtl:rotate-180">‹</span>
      </Link>
      <span className="font-bold text-slate-800">{formatMonth(month, lang)}</span>
      {canNext ? (
        <Link href={hrefFor(next)} className="rounded-lg px-3 py-2 text-lg text-slate-600 hover:bg-slate-100" aria-label="next month">
          <span className="inline-block rtl:rotate-180">›</span>
        </Link>
      ) : (
        <span className="px-3 py-2 text-lg text-slate-300">
          <span className="inline-block rtl:rotate-180">›</span>
        </span>
      )}
    </div>
  );
}
