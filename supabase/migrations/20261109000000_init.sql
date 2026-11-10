-- =====================================================================
-- Taekwondo club: attendance & athlete evaluation
-- Schema, helper functions, triggers, RPCs and row-level security.
-- All "local" dates/times are stored in the club's timezone
-- (default Africa/Casablanca) and converted with AT TIME ZONE.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.user_role as enum ('admin', 'coach', 'athlete');
create type public.session_status as enum ('scheduled', 'completed', 'cancelled');
create type public.attendance_status as enum ('present', 'late', 'absent', 'excused');
create type public.attendance_method as enum ('self', 'manual');

-- ---------------------------------------------------------------------
-- Clubs & profiles
-- ---------------------------------------------------------------------
create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  timezone text not null default 'Africa/Casablanca',
  default_language text not null default 'ar' check (default_language in ('ar', 'fr')),
  -- check-in window, relative to the session start time
  checkin_opens_before_min int not null default 30 check (checkin_opens_before_min between 0 and 720),
  checkin_closes_after_min int not null default 45 check (checkin_closes_after_min between 0 and 720),
  -- a self check-in after start + late_after_min is recorded as "late"
  late_after_min int not null default 10 check (late_after_min between 0 and 720),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  club_id uuid not null references public.clubs (id) on delete cascade,
  role public.user_role not null,
  full_name text not null,
  email text,
  language text check (language in ('ar', 'fr')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.profiles (club_id);

-- ---------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so they can be used inside RLS
-- policies without recursion)
-- ---------------------------------------------------------------------
create or replace function public.current_club_id()
returns uuid language sql stable security definer set search_path = public as $$
  select club_id from public.profiles where id = auth.uid() and active
$$;

create or replace function public.my_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('admin', 'coach') from public.profiles where id = auth.uid() and active), false)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid() and active), false)
$$;

-- ---------------------------------------------------------------------
-- Training types
-- ---------------------------------------------------------------------
create table public.training_types (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null default public.current_club_id() references public.clubs (id) on delete cascade,
  name_ar text not null check (length(trim(name_ar)) between 1 and 80),
  name_fr text not null check (length(trim(name_fr)) between 1 and 80),
  color text not null default '#2563eb' check (color ~ '^#[0-9a-fA-F]{6}$'),
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.training_types (club_id);

-- ---------------------------------------------------------------------
-- Athletes
-- ---------------------------------------------------------------------
create table public.athletes (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null default public.current_club_id() references public.clubs (id) on delete cascade,
  profile_id uuid unique references public.profiles (id) on delete set null,
  full_name text not null check (length(trim(full_name)) between 1 and 120),
  photo_path text,
  belt text,
  weight_kg numeric(5, 2) check (weight_kg is null or weight_kg between 10 and 250),
  weight_updated_on date,
  weight_category text,
  weekly_target int check (weekly_target is null or weekly_target between 1 and 21),
  date_of_birth date,
  joined_on date not null default (now() at time zone 'Africa/Casablanca')::date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.athletes (club_id);

create table public.athlete_training_types (
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  training_type_id uuid not null references public.training_types (id) on delete cascade,
  primary key (athlete_id, training_type_id)
);
create index on public.athlete_training_types (training_type_id);

create or replace function public.my_athlete_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.athletes where profile_id = auth.uid()
$$;

-- ---------------------------------------------------------------------
-- Sessions
-- ---------------------------------------------------------------------
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null default public.current_club_id() references public.clubs (id) on delete cascade,
  session_date date not null,
  start_time time not null,
  end_time time not null,
  location text,
  notes text,
  status public.session_status not null default 'scheduled',
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sessions_time_order check (end_time > start_time)
);
create index on public.sessions (club_id, session_date);

create table public.session_training_types (
  session_id uuid not null references public.sessions (id) on delete cascade,
  training_type_id uuid not null references public.training_types (id) on delete cascade,
  primary key (session_id, training_type_id)
);
create index on public.session_training_types (training_type_id);

-- Check-in codes live in their own table so athletes cannot read them
-- (they must be physically present to see the QR / code).
create table public.session_codes (
  session_id uuid primary key references public.sessions (id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  created_at timestamptz not null default now()
);

create or replace function public.generate_session_code()
returns text language plpgsql volatile as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I
  result text;
begin
  loop
    result := '';
    for i in 1..6 loop
      result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.session_codes where code = result);
  end loop;
  return result;
end $$;

create or replace function public.tg_session_code()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.session_codes (session_id, code) values (new.id, public.generate_session_code());
  return new;
end $$;

create trigger sessions_create_code after insert on public.sessions
for each row execute function public.tg_session_code();

-- Staff can rotate a code (e.g. if it was shared outside the dojang)
create or replace function public.regenerate_session_code(p_session_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  if not public.is_staff() or not exists (
    select 1 from public.sessions where id = p_session_id and club_id = public.current_club_id()
  ) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  v_code := public.generate_session_code();
  update public.session_codes set code = v_code, created_at = now() where session_id = p_session_id;
  return v_code;
end $$;

-- ---------------------------------------------------------------------
-- Attendance
-- ---------------------------------------------------------------------
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null default public.current_club_id() references public.clubs (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  status public.attendance_status not null,
  method public.attendance_method not null default 'manual',
  checked_in_at timestamptz,
  note text,
  recorded_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, athlete_id) -- prevents duplicate check-ins
);
create index on public.attendance (athlete_id);

-- Simple audit log of manual additions / corrections / removals
create table public.attendance_changes (
  id bigint generated always as identity primary key,
  club_id uuid not null references public.clubs (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  old_status public.attendance_status,
  new_status public.attendance_status,
  note text,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now()
);
create index on public.attendance_changes (session_id);

create or replace function public.tg_log_attendance_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.method = 'manual' then
      insert into public.attendance_changes (club_id, session_id, athlete_id, old_status, new_status, note, changed_by)
      values (new.club_id, new.session_id, new.athlete_id, null, new.status, new.note, auth.uid());
    end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if old.status is distinct from new.status or old.note is distinct from new.note then
      insert into public.attendance_changes (club_id, session_id, athlete_id, old_status, new_status, note, changed_by)
      values (new.club_id, new.session_id, new.athlete_id, old.status, new.status, new.note, auth.uid());
    end if;
    return new;
  else -- DELETE
    insert into public.attendance_changes (club_id, session_id, athlete_id, old_status, new_status, note, changed_by)
    values (old.club_id, old.session_id, old.athlete_id, old.status, null, null, auth.uid());
    return old;
  end if;
end $$;

create trigger attendance_audit after insert or update or delete on public.attendance
for each row execute function public.tg_log_attendance_change();

-- ---------------------------------------------------------------------
-- Monthly evaluations (always entered by a coach)
-- ---------------------------------------------------------------------
create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null default public.current_club_id() references public.clubs (id) on delete cascade,
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  discipline smallint not null check (discipline between 1 and 5),
  effort smallint not null check (effort between 1 and 5),
  fitness smallint not null check (fitness between 1 and 5),
  technique smallint not null check (technique between 1 and 5),
  progress smallint not null check (progress between 1 and 5),
  comment text,
  next_goal text,
  attendance_summary jsonb not null default '{}'::jsonb,
  coach_id uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (athlete_id, month)
);

-- ---------------------------------------------------------------------
-- Invitations
-- ---------------------------------------------------------------------
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null default public.current_club_id() references public.clubs (id) on delete cascade,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role public.user_role not null,
  full_name text,
  athlete_id uuid references public.athletes (id) on delete cascade,
  token text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null
);
create index on public.invitations (club_id);

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------
create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger athletes_touch before update on public.athletes for each row execute function public.tg_touch_updated_at();
create trigger sessions_touch before update on public.sessions for each row execute function public.tg_touch_updated_at();
create trigger attendance_touch before update on public.attendance for each row execute function public.tg_touch_updated_at();
create trigger evaluations_touch before update on public.evaluations for each row execute function public.tg_touch_updated_at();

-- ---------------------------------------------------------------------
-- Expected attendance view
-- One row per (session, athlete) the athlete was expected at:
--  * session not cancelled
--  * athlete active and joined on/before the session date
--  * session shares a training type with the athlete (or has no type)
--  * OR the athlete actually has an attendance record for it
-- effective_status = recorded status, or "absent" once the session is
-- completed / over, otherwise NULL (still upcoming).
-- security_invoker => the caller's RLS applies.
-- ---------------------------------------------------------------------
create view public.attendance_expected with (security_invoker = true) as
select
  s.club_id,
  s.id as session_id,
  s.session_date,
  s.start_time,
  s.end_time,
  s.status as session_status,
  a.id as athlete_id,
  att.status as recorded_status,
  att.checked_in_at,
  att.method,
  case
    when att.status is not null then att.status
    when s.status = 'completed'
      or ((s.session_date + s.end_time) at time zone c.timezone) < now() then 'absent'::public.attendance_status
    else null
  end as effective_status
from public.sessions s
join public.clubs c on c.id = s.club_id
join public.athletes a on a.club_id = s.club_id
left join public.attendance att on att.session_id = s.id and att.athlete_id = a.id
where s.status <> 'cancelled'
  and (
    att.id is not null
    or (
      a.active
      and a.joined_on <= s.session_date
      and (
        not exists (select 1 from public.session_training_types x where x.session_id = s.id)
        or exists (
          select 1
          from public.session_training_types stt
          join public.athlete_training_types atl on atl.training_type_id = stt.training_type_id
          where stt.session_id = s.id and atl.athlete_id = a.id
        )
      )
    )
  );

-- ---------------------------------------------------------------------
-- RPC: athlete self check-in with a session code (from QR or typed)
-- ---------------------------------------------------------------------
create or replace function public.check_in(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_athlete public.athletes;
  v_session public.sessions;
  v_club public.clubs;
  v_start timestamptz;
  v_opens timestamptz;
  v_closes timestamptz;
  v_now timestamptz := now();
  v_status public.attendance_status;
  v_existing public.attendance;
begin
  select * into v_athlete from public.athletes where profile_id = auth.uid();
  if not found or not v_athlete.active then
    return jsonb_build_object('ok', false, 'error', 'not_athlete');
  end if;

  select s.* into v_session
  from public.session_codes sc
  join public.sessions s on s.id = sc.session_id
  where sc.code = upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'))
    and s.club_id = v_athlete.club_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  if v_session.status = 'cancelled' then
    return jsonb_build_object('ok', false, 'error', 'cancelled', 'session_id', v_session.id);
  end if;

  select * into v_club from public.clubs where id = v_session.club_id;
  v_start := (v_session.session_date + v_session.start_time) at time zone v_club.timezone;
  v_opens := v_start - make_interval(mins => v_club.checkin_opens_before_min);
  v_closes := v_start + make_interval(mins => v_club.checkin_closes_after_min);

  select * into v_existing from public.attendance
  where session_id = v_session.id and athlete_id = v_athlete.id;
  if found then
    return jsonb_build_object('ok', false, 'error', 'already', 'status', v_existing.status,
                              'checked_in_at', v_existing.checked_in_at, 'session_id', v_session.id);
  end if;

  if v_now < v_opens then
    return jsonb_build_object('ok', false, 'error', 'too_early', 'opens_at', v_opens, 'session_id', v_session.id);
  end if;
  if v_now > v_closes then
    return jsonb_build_object('ok', false, 'error', 'closed', 'closed_at', v_closes, 'session_id', v_session.id);
  end if;

  v_status := case when v_now > v_start + make_interval(mins => v_club.late_after_min)
                   then 'late'::public.attendance_status else 'present'::public.attendance_status end;

  insert into public.attendance (club_id, session_id, athlete_id, status, method, checked_in_at, recorded_by)
  values (v_session.club_id, v_session.id, v_athlete.id, v_status, 'self', v_now, auth.uid())
  on conflict (session_id, athlete_id) do nothing;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'already', 'session_id', v_session.id);
  end if;

  return jsonb_build_object('ok', true, 'status', v_status, 'checked_in_at', v_now, 'session_id', v_session.id);
end $$;

-- ---------------------------------------------------------------------
-- Invitations: applied automatically when an invited user signs up
-- (token in user metadata) or via accept_invitation() for an existing
-- account. The very first sign-up with a club_name creates the club.
-- ---------------------------------------------------------------------
create or replace function public._apply_invitation(p_inv public.invitations, p_user uuid, p_name text, p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare v_name text := coalesce(nullif(trim(p_inv.full_name), ''), nullif(trim(p_name), ''), split_part(p_email, '@', 1));
begin
  if exists (select 1 from public.profiles where id = p_user) then
    raise exception 'already_member';
  end if;
  insert into public.profiles (id, club_id, role, full_name, email)
  values (p_user, p_inv.club_id, p_inv.role, v_name, p_email);

  if p_inv.role = 'athlete' then
    if p_inv.athlete_id is not null then
      update public.athletes set profile_id = p_user
      where id = p_inv.athlete_id and club_id = p_inv.club_id and profile_id is null;
      if not found then raise exception 'athlete_already_linked'; end if;
    else
      insert into public.athletes (club_id, profile_id, full_name) values (p_inv.club_id, p_user, v_name);
    end if;
  end if;

  update public.invitations set accepted_at = now(), accepted_by = p_user where id = p_inv.id;
end $$;

create or replace function public.seed_default_training_types(p_club uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.training_types (club_id, name_ar, name_fr, color, sort_order) values
    (p_club, 'كيوروجي (قتال)', 'Kyorugi (combat)', '#dc2626', 1),
    (p_club, 'بومسي (أشكال)', 'Poomsae (formes)', '#2563eb', 2),
    (p_club, 'تايكوندو عام', 'Taekwondo général', '#16a34a', 3),
    (p_club, 'لياقة بدنية', 'Préparation physique', '#d97706', 4);
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_token text := v_meta ->> 'invite_token';
  v_name text := nullif(trim(v_meta ->> 'full_name'), '');
  v_inv public.invitations;
  v_club uuid;
begin
  if v_token is not null then
    select * into v_inv from public.invitations
    where token = v_token and accepted_at is null and expires_at > now()
      and lower(email) = lower(new.email);
    if found then
      perform public._apply_invitation(v_inv, new.id, v_name, new.email);
    end if;
    return new;
  end if;

  -- First-run bootstrap: only when no club exists yet.
  if nullif(trim(v_meta ->> 'club_name'), '') is not null and not exists (select 1 from public.clubs) then
    insert into public.clubs (name) values (trim(v_meta ->> 'club_name')) returning id into v_club;
    insert into public.profiles (id, club_id, role, full_name, email)
    values (new.id, v_club, 'admin', coalesce(v_name, split_part(new.email, '@', 1)), new.email);
    perform public.seed_default_training_types(v_club);
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.accept_invitation(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_inv public.invitations;
  v_email text;
  v_name text;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'not_signed_in'); end if;
  select email, raw_user_meta_data ->> 'full_name' into v_email, v_name from auth.users where id = auth.uid();
  select * into v_inv from public.invitations where token = p_token;
  if not found then return jsonb_build_object('ok', false, 'error', 'invalid_invite'); end if;
  if v_inv.accepted_at is not null then return jsonb_build_object('ok', false, 'error', 'invite_used'); end if;
  if v_inv.expires_at < now() then return jsonb_build_object('ok', false, 'error', 'invite_expired'); end if;
  if lower(v_inv.email) <> lower(v_email) then return jsonb_build_object('ok', false, 'error', 'invite_wrong_email'); end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then
    return jsonb_build_object('ok', false, 'error', 'already_member');
  end if;
  perform public._apply_invitation(v_inv, auth.uid(), v_name, v_email);
  return jsonb_build_object('ok', true);
end $$;

-- Public, minimal lookup so the invite page can show club & role
create or replace function public.invitation_info(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'email', i.email, 'role', i.role, 'full_name', i.full_name, 'club_name', c.name,
    'expired', i.expires_at < now(), 'accepted', i.accepted_at is not null)
  from public.invitations i join public.clubs c on c.id = i.club_id
  where i.token = p_token
$$;

create or replace function public.club_exists()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.clubs)
$$;

-- Admin: change a member's role or deactivate them
create or replace function public.admin_set_member(p_profile uuid, p_role public.user_role, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_target public.profiles;
begin
  if not public.is_admin() then raise exception 'not_allowed' using errcode = '42501'; end if;
  select * into v_target from public.profiles where id = p_profile and club_id = public.current_club_id();
  if not found then raise exception 'not_found'; end if;
  if p_profile = auth.uid() then raise exception 'cannot_change_self'; end if;
  if v_target.role = 'athlete' and p_role <> 'athlete' then raise exception 'athlete_role_fixed'; end if;
  if v_target.role <> 'athlete' and p_role = 'athlete' then raise exception 'athlete_role_fixed'; end if;
  update public.profiles set role = p_role, active = p_active where id = p_profile;
end $$;

-- ---------------------------------------------------------------------
-- Grants & Row Level Security
-- ---------------------------------------------------------------------
revoke execute on function public._apply_invitation(public.invitations, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.seed_default_training_types(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.invitation_info(text) to anon, authenticated;
grant execute on function public.club_exists() to anon, authenticated;

alter table public.clubs enable row level security;
alter table public.profiles enable row level security;
alter table public.training_types enable row level security;
alter table public.athletes enable row level security;
alter table public.athlete_training_types enable row level security;
alter table public.sessions enable row level security;
alter table public.session_training_types enable row level security;
alter table public.session_codes enable row level security;
alter table public.attendance enable row level security;
alter table public.attendance_changes enable row level security;
alter table public.evaluations enable row level security;
alter table public.invitations enable row level security;

-- clubs
create policy clubs_select on public.clubs for select to authenticated
  using (id = public.current_club_id());
create policy clubs_update on public.clubs for update to authenticated
  using (id = public.current_club_id() and public.is_admin())
  with check (id = public.current_club_id() and public.is_admin());

-- profiles: you see yourself; staff see the whole club.
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or (public.is_staff() and club_id = public.current_club_id()));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- Only name & language may be changed directly (role/active via admin_set_member)
revoke update on public.profiles from authenticated;
grant update (full_name, language) on public.profiles to authenticated;

-- training types: everyone in the club reads, staff manage
create policy tt_select on public.training_types for select to authenticated
  using (club_id = public.current_club_id());
create policy tt_write on public.training_types for all to authenticated
  using (club_id = public.current_club_id() and public.is_staff())
  with check (club_id = public.current_club_id() and public.is_staff());

-- athletes: private to the athlete and club staff
create policy athletes_select on public.athletes for select to authenticated
  using ((public.is_staff() and club_id = public.current_club_id()) or profile_id = auth.uid());
create policy athletes_write on public.athletes for all to authenticated
  using (public.is_staff() and club_id = public.current_club_id())
  with check (public.is_staff() and club_id = public.current_club_id());

create policy att_types_select on public.athlete_training_types for select to authenticated
  using (exists (select 1 from public.athletes a where a.id = athlete_id)); -- inherits athletes RLS
create policy att_types_write on public.athlete_training_types for all to authenticated
  using (public.is_staff() and exists (select 1 from public.athletes a where a.id = athlete_id and a.club_id = public.current_club_id()))
  with check (public.is_staff()
    and exists (select 1 from public.athletes a where a.id = athlete_id and a.club_id = public.current_club_id())
    and exists (select 1 from public.training_types t where t.id = training_type_id and t.club_id = public.current_club_id()));

-- sessions: the whole club can read the schedule, staff manage it
create policy sessions_select on public.sessions for select to authenticated
  using (club_id = public.current_club_id());
create policy sessions_write on public.sessions for all to authenticated
  using (public.is_staff() and club_id = public.current_club_id())
  with check (public.is_staff() and club_id = public.current_club_id());

create policy stt_select on public.session_training_types for select to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_id));
create policy stt_write on public.session_training_types for all to authenticated
  using (public.is_staff() and exists (select 1 from public.sessions s where s.id = session_id and s.club_id = public.current_club_id()))
  with check (public.is_staff()
    and exists (select 1 from public.sessions s where s.id = session_id and s.club_id = public.current_club_id())
    and exists (select 1 from public.training_types t where t.id = training_type_id and t.club_id = public.current_club_id()));

-- session codes: staff only (writes go through triggers / RPC)
create policy codes_select on public.session_codes for select to authenticated
  using (public.is_staff() and exists (select 1 from public.sessions s where s.id = session_id and s.club_id = public.current_club_id()));

-- attendance: athlete sees own, staff see & manage club records.
-- Athletes create their own records only through check_in().
create policy attendance_select on public.attendance for select to authenticated
  using ((public.is_staff() and club_id = public.current_club_id()) or athlete_id = public.my_athlete_id());
create policy attendance_write on public.attendance for all to authenticated
  using (public.is_staff() and club_id = public.current_club_id())
  with check (public.is_staff() and club_id = public.current_club_id()
    and exists (select 1 from public.sessions s where s.id = session_id and s.club_id = public.current_club_id())
    and exists (select 1 from public.athletes a where a.id = athlete_id and a.club_id = public.current_club_id()));

create policy attendance_changes_select on public.attendance_changes for select to authenticated
  using (public.is_staff() and club_id = public.current_club_id());

-- evaluations: athlete sees own, staff manage
create policy evaluations_select on public.evaluations for select to authenticated
  using ((public.is_staff() and club_id = public.current_club_id()) or athlete_id = public.my_athlete_id());
create policy evaluations_write on public.evaluations for all to authenticated
  using (public.is_staff() and club_id = public.current_club_id())
  with check (public.is_staff() and club_id = public.current_club_id()
    and exists (select 1 from public.athletes a where a.id = athlete_id and a.club_id = public.current_club_id()));

-- invitations: staff invite athletes; only the admin invites coaches/admins
create policy invitations_select on public.invitations for select to authenticated
  using (public.is_staff() and club_id = public.current_club_id());
create policy invitations_insert on public.invitations for insert to authenticated
  with check (public.is_staff() and club_id = public.current_club_id() and (role = 'athlete' or public.is_admin())
    and (athlete_id is null or exists (select 1 from public.athletes a where a.id = athlete_id and a.club_id = public.current_club_id())));
create policy invitations_delete on public.invitations for delete to authenticated
  using (public.is_staff() and club_id = public.current_club_id() and accepted_at is null);

-- ---------------------------------------------------------------------
-- Storage: private bucket for athlete photos, path "<club_id>/<athlete_id>.<ext>"
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('athlete-photos', 'athlete-photos', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy photos_select on storage.objects for select to authenticated
  using (bucket_id = 'athlete-photos'
    and (storage.foldername(name))[1] = public.current_club_id()::text
    and (public.is_staff() or split_part(storage.filename(name), '.', 1) = public.my_athlete_id()::text));
create policy photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'athlete-photos' and public.is_staff()
    and (storage.foldername(name))[1] = public.current_club_id()::text);
create policy photos_update on storage.objects for update to authenticated
  using (bucket_id = 'athlete-photos' and public.is_staff()
    and (storage.foldername(name))[1] = public.current_club_id()::text);
create policy photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'athlete-photos' and public.is_staff()
    and (storage.foldername(name))[1] = public.current_club_id()::text);
