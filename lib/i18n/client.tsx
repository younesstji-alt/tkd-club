"use client";
import { createContext, useContext, useMemo } from "react";
import { translate, type Lang, type T } from "./dict";

const Ctx = createContext<{ lang: Lang; t: T }>({ lang: "ar", t: (k, v) => translate("ar", k, v) });

export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const value = useMemo(() => ({ lang, t: ((k, v) => translate(lang, k, v)) as T }), [lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return useContext(Ctx);
}
