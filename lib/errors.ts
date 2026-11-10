import type { DictKey } from "./i18n/dict";

/** Map a Supabase/Postgres error to a user-facing message key. */
export function errorKey(err: { message?: string; code?: string } | null | undefined): DictKey {
  if (!err) return "genericError";
  const msg = err.message ?? "";
  if (err.code === "42501" || /row-level security|permission denied|not_allowed/i.test(msg)) return "notAllowed";
  if (/cannot_change_self/.test(msg)) return "cannotChangeSelf";
  if (/athlete_role_fixed/.test(msg)) return "athleteRoleFixed";
  if (/already_member/.test(msg)) return "alreadyMember";
  if (/sessions_time_order/.test(msg)) return "endAfterStart";
  if (/fetch failed|network/i.test(msg)) return "networkError";
  if (err.code === "PGRST116") return "notFound";
  return "genericError";
}
