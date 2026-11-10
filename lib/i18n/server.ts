import { cookies } from "next/headers";
import { DEFAULT_LANG, translate, type Lang, type T } from "./dict";

export async function getLang(): Promise<Lang> {
  const c = (await cookies()).get("lang")?.value;
  return c === "fr" || c === "ar" ? c : DEFAULT_LANG;
}

export async function getT(): Promise<{ lang: Lang; t: T }> {
  const lang = await getLang();
  return { lang, t: (key, vars) => translate(lang, key, vars) };
}
