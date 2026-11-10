"use client";
import { useI18n } from "@/lib/i18n/client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const { t } = useI18n();
  return (
    <div className="card flex flex-col items-center gap-3 py-10 text-center">
      <div className="text-4xl">⚠️</div>
      <p className="text-slate-700">{t("genericError")}</p>
      <button className="btn-primary" onClick={reset}>
        ↻
      </button>
    </div>
  );
}
