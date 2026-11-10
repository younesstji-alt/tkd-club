"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { setLanguage } from "@/app/actions/auth";
import { useI18n } from "@/lib/i18n/client";

export function LangSwitch({ className = "" }: { className?: string }) {
  const { lang } = useI18n();
  const path = usePathname();
  const sp = useSearchParams();
  const back = path + (sp.toString() ? `?${sp}` : "");
  return (
    <form action={setLanguage} className={`inline-flex rounded-full border border-slate-300 bg-white p-0.5 text-xs ${className}`}>
      <input type="hidden" name="back" value={back} />
      {(["ar", "fr"] as const).map((l) => (
        <button
          key={l}
          name="lang"
          value={l}
          aria-pressed={lang === l}
          className={`rounded-full px-3 py-1.5 font-semibold ${lang === l ? "bg-brand-600 text-white" : "text-slate-600"}`}
        >
          {l === "ar" ? "العربية" : "Français"}
        </button>
      ))}
    </form>
  );
}
