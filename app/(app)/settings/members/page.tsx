import { requireAdmin } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { getOrigin } from "@/lib/origin";
import { formatDate } from "@/lib/time";
import { PageHeader, SectionTitle } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { InviteBox, InviteLink } from "@/components/InviteBox";
import { MemberRow } from "@/components/SettingsForms";
import { deleteInvite } from "@/app/actions/athletes";
import type { Profile, Role } from "@/lib/types";

export default async function MembersPage() {
  const { supabase, profile } = await requireAdmin();
  const { t, lang } = await getT();
  const [{ data: members }, { data: invites }, { data: unlinked }] = await Promise.all([
    supabase.from("profiles").select("*").order("role").order("full_name"),
    supabase.from("invitations").select("*").is("accepted_at", null).order("created_at", { ascending: false }),
    supabase.from("athletes").select("id,full_name").is("profile_id", null).eq("active", true).order("full_name"),
  ]);
  const origin = await getOrigin();
  const staff = ((members ?? []) as Profile[]).filter((m) => m.role !== "athlete");
  const athletes = ((members ?? []) as Profile[]).filter((m) => m.role === "athlete");

  return (
    <>
      <PageHeader title={t("members")} back="/settings" />

      <SectionTitle>{t("invite")}</SectionTitle>
      <div className="card">
        <InviteBox roles={["coach", "athlete", "admin"] as Role[]} athletes={(unlinked ?? []).map((a) => ({ id: a.id, name: a.full_name }))} />
      </div>

      <SectionTitle>{t("pendingInvites")}</SectionTitle>
      {(invites ?? []).length === 0 ? (
        <p className="text-sm text-slate-500">{t("noPendingInvites")}</p>
      ) : (
        <ul className="space-y-2">
          {(invites ?? []).map((inv) => (
            <li key={inv.id} className="card space-y-2">
              <div className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium" dir="ltr">
                    {inv.email}
                  </div>
                  <div className="text-xs text-slate-500">
                    {t(`role_${inv.role as Role}`)} · {t("expires", { date: formatDate(inv.expires_at, lang) })}
                  </div>
                </div>
                <form action={deleteInvite}>
                  <input type="hidden" name="id" value={inv.id} />
                  <SubmitButton className="btn-ghost text-red-600">{t("delete")}</SubmitButton>
                </form>
              </div>
              <InviteLink link={`${origin}/invite/${inv.token}`} />
            </li>
          ))}
        </ul>
      )}

      <SectionTitle>
        {t("role_coach")} ({staff.length})
      </SectionTitle>
      <div className="card divide-y divide-slate-100 py-1">
        {staff.map((m) => (
          <MemberRow key={m.id} member={m} isSelf={m.id === profile.id} />
        ))}
      </div>

      <SectionTitle>
        {t("athletes")} ({athletes.length})
      </SectionTitle>
      <div className="card divide-y divide-slate-100 py-1">
        {athletes.map((m) => (
          <MemberRow key={m.id} member={m} isSelf={false} />
        ))}
      </div>
    </>
  );
}
