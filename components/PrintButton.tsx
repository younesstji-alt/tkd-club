"use client";
import { useI18n } from "@/lib/i18n/client";

export function PrintButton() {
  const { t } = useI18n();
  return (
    <button type="button" onClick={() => window.print()} className="btn-secondary">
      🖨 {t("print")}
    </button>
  );
}
