-- Hardening from the Supabase security advisor:
-- fixed search_path everywhere, and no anonymous access to SECURITY DEFINER
-- functions except the two the login / invite pages need.
alter function public.generate_session_code() set search_path = public;
alter function public.tg_touch_updated_at() set search_path = public;

revoke execute on function public.tg_log_attendance_change() from public, anon, authenticated;
revoke execute on function public.tg_session_code() from public, anon, authenticated;

revoke execute on function public.accept_invitation(text) from public, anon;
revoke execute on function public.admin_set_member(uuid, public.user_role, boolean) from public, anon;
revoke execute on function public.check_in(text) from public, anon;
revoke execute on function public.current_club_id() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_staff() from public, anon;
revoke execute on function public.my_athlete_id() from public, anon;
revoke execute on function public.my_role() from public, anon;
revoke execute on function public.regenerate_session_code(uuid) from public, anon;

grant execute on function public.accept_invitation(text), public.admin_set_member(uuid, public.user_role, boolean),
  public.check_in(text), public.current_club_id(), public.is_admin(), public.is_staff(), public.my_athlete_id(),
  public.my_role(), public.regenerate_session_code(uuid) to authenticated;
grant execute on function public.invitation_info(text), public.club_exists() to anon, authenticated;
