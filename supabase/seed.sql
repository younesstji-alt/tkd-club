-- =====================================================================
-- Demo data for previewing the app. Safe to skip in production.
-- All demo accounts use the password:  Demo1234!
--   admin@demo.tkd     Head coach (admin)
--   coach@demo.tkd     Coach
--   yassine@demo.tkd   Athlete (Kyorugi + general)
--   salma@demo.tkd     Athlete (Poomsae + general)
-- Sessions are generated relative to today's date (Africa/Casablanca),
-- including one session "now" so the QR check-in can be tried (code TKD123).
-- =====================================================================

do $$
declare
  v_club uuid := '11111111-1111-1111-1111-111111111111';
  v_admin uuid := 'a0000000-0000-0000-0000-000000000001';
  v_coach uuid := 'a0000000-0000-0000-0000-000000000002';
  v_u_yassine uuid := 'a0000000-0000-0000-0000-000000000003';
  v_u_salma uuid := 'a0000000-0000-0000-0000-000000000004';
  t_kyo uuid; t_poom uuid; t_gen uuid; t_fit uuid;
  v_today date := (now() at time zone 'Africa/Casablanca')::date;
  v_now_time time := (now() at time zone 'Africa/Casablanca')::time;
  v_start time;
  v_session uuid;
  r record;
  d date;
  u record;
begin
  insert into public.clubs (id, name) values (v_club, 'نادي النجمة للتايكوندو');
  perform public.seed_default_training_types(v_club);
  select id into t_kyo from public.training_types where club_id = v_club and sort_order = 1;
  select id into t_poom from public.training_types where club_id = v_club and sort_order = 2;
  select id into t_gen from public.training_types where club_id = v_club and sort_order = 3;
  select id into t_fit from public.training_types where club_id = v_club and sort_order = 4;

  -- auth users
  for u in select * from (values
    (v_admin, 'admin@demo.tkd', 'كريم العلوي'),
    (v_coach, 'coach@demo.tkd', 'سناء بنعلي'),
    (v_u_yassine, 'yassine@demo.tkd', 'ياسين المرابط'),
    (v_u_salma, 'salma@demo.tkd', 'سلمى الإدريسي')
  ) as x(id, email, name) loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token)
    values ('00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
      extensions.crypt('Demo1234!', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', u.name), now(), now(),
      '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), u.id, u.id::text,
      jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), 'email', now(), now(), now());
  end loop;

  insert into public.profiles (id, club_id, role, full_name, email) values
    (v_admin, v_club, 'admin', 'كريم العلوي', 'admin@demo.tkd'),
    (v_coach, v_club, 'coach', 'سناء بنعلي', 'coach@demo.tkd'),
    (v_u_yassine, v_club, 'athlete', 'ياسين المرابط', 'yassine@demo.tkd'),
    (v_u_salma, v_club, 'athlete', 'سلمى الإدريسي', 'salma@demo.tkd');

  -- athletes (two linked to logins, the rest managed by coaches only)
  insert into public.athletes (id, club_id, profile_id, full_name, belt, weight_kg, weight_updated_on, weight_category, weekly_target, date_of_birth, joined_on) values
    ('b0000000-0000-0000-0000-000000000001', v_club, v_u_yassine, 'ياسين المرابط', 'أسود 1 دان', 63.4, v_today - 12, '-63 kg', 4, '2008-03-14', v_today - 400),
    ('b0000000-0000-0000-0000-000000000002', v_club, v_u_salma, 'سلمى الإدريسي', 'أحمر', 52.1, v_today - 30, '-53 kg', 3, '2010-07-02', v_today - 300),
    ('b0000000-0000-0000-0000-000000000003', v_club, null, 'آدم بنجلون', 'أزرق', 45.0, v_today - 20, '-45 kg', 3, '2012-11-20', v_today - 200),
    ('b0000000-0000-0000-0000-000000000004', v_club, null, 'إيناس الفاسي', 'أخضر', 38.5, v_today - 45, '-40 kg', 2, '2013-01-09', v_today - 150),
    ('b0000000-0000-0000-0000-000000000005', v_club, null, 'Mehdi Tazi', 'Bleu', 70.2, v_today - 5, '-74 kg', 4, '2007-05-30', v_today - 500),
    ('b0000000-0000-0000-0000-000000000006', v_club, null, 'هبة الصديقي', 'أصفر', 30.0, v_today - 60, '-32 kg', 2, '2015-09-17', v_today - 20);

  insert into public.athlete_training_types (athlete_id, training_type_id) values
    ('b0000000-0000-0000-0000-000000000001', t_kyo), ('b0000000-0000-0000-0000-000000000001', t_gen), ('b0000000-0000-0000-0000-000000000001', t_fit),
    ('b0000000-0000-0000-0000-000000000002', t_poom), ('b0000000-0000-0000-0000-000000000002', t_gen),
    ('b0000000-0000-0000-0000-000000000003', t_gen), ('b0000000-0000-0000-0000-000000000003', t_kyo),
    ('b0000000-0000-0000-0000-000000000004', t_gen), ('b0000000-0000-0000-0000-000000000004', t_poom),
    ('b0000000-0000-0000-0000-000000000005', t_kyo), ('b0000000-0000-0000-0000-000000000005', t_fit),
    ('b0000000-0000-0000-0000-000000000006', t_gen);

  -- weekly schedule for the past ~7 weeks and the next week
  for d in select generate_series(v_today - 49, v_today + 7, interval '1 day')::date loop
    continue when d = v_today; -- today's session is created separately below
    for r in
      select * from (values
        (1, '18:00'::time, '19:30'::time, 'القاعة الرئيسية', array[t_gen, t_kyo]),
        (2, '18:00'::time, '19:00'::time, 'القاعة الصغيرة', array[t_poom]),
        (3, '18:00'::time, '19:30'::time, 'القاعة الرئيسية', array[t_gen, t_kyo]),
        (4, '18:00'::time, '19:00'::time, 'القاعة الصغيرة', array[t_poom]),
        (5, '18:00'::time, '19:30'::time, 'القاعة الرئيسية', array[t_gen]),
        (6, '10:00'::time, '11:30'::time, 'الملعب الخارجي', array[t_fit, t_kyo])
      ) as s(dow, st, et, loc, types)
      where s.dow = extract(isodow from d)
    loop
      insert into public.sessions (club_id, session_date, start_time, end_time, location, status, created_by,
        notes)
      values (v_club, d, r.st, r.et, r.loc,
        case when d < v_today then 'completed'::public.session_status
             else 'scheduled'::public.session_status end,
        v_coach, null)
      returning id into v_session;
      insert into public.session_training_types (session_id, training_type_id) select v_session, unnest(r.types);
    end loop;
  end loop;

  -- one cancelled session in the past (excluded from totals)
  update public.sessions set status = 'cancelled', notes = 'ألغيت بسبب صيانة القاعة'
  where id = (select id from public.sessions where club_id = v_club and session_date < v_today - 7 order by session_date desc limit 1);

  -- attendance for completed sessions (deterministic pseudo-random)
  insert into public.attendance (club_id, session_id, athlete_id, status, method, checked_in_at, recorded_by)
  select e.club_id, e.session_id, e.athlete_id,
    case when h < 62 then 'present' when h < 77 then 'late' when h < 87 then 'excused' else 'absent' end::public.attendance_status,
    case when h < 77 then 'self' else 'manual' end::public.attendance_method,
    case when h < 77 then ((e.session_date + e.start_time) at time zone 'Africa/Casablanca')
                         + make_interval(mins => case when h < 62 then -5 else 15 end) end,
    case when h < 77 then (select profile_id from public.athletes where id = e.athlete_id) else v_coach end
  from (
    select x.*, abs(hashtext(x.session_id::text || x.athlete_id::text)) % 100 as h
    from public.attendance_expected x
    where x.club_id = v_club and x.session_status = 'completed'
  ) e;
  -- self check-ins of athletes without a login are recorded as manual by the coach
  update public.attendance set method = 'manual', recorded_by = v_coach where recorded_by is null;

  -- today's session, started 5 minutes before the seed ran so check-in is open right now
  v_start := least(date_trunc('minute', v_now_time - interval '5 minutes')::time, '21:00'::time);
  insert into public.sessions (club_id, session_date, start_time, end_time, location, status, created_by, notes)
  values (v_club, v_today, v_start, v_start + interval '90 minutes', 'القاعة الرئيسية', 'scheduled', v_coach,
          'حصة تجريبية: جرّب تسجيل الحضور بالرمز TKD123')
  returning id into v_session;
  insert into public.session_training_types values (v_session, t_gen), (v_session, t_kyo), (v_session, t_poom);
  update public.session_codes set code = 'TKD123' where session_id = v_session;

  -- seed rows are not real manual corrections
  delete from public.attendance_changes where club_id = v_club;

  -- evaluations for last month
  insert into public.evaluations (club_id, athlete_id, month, discipline, effort, fitness, technique, progress, comment, next_goal, coach_id, attendance_summary) values
    (v_club, 'b0000000-0000-0000-0000-000000000001', (date_trunc('month', v_today) - interval '1 month')::date, 5, 4, 4, 4, 4,
      'التزام ممتاز وتحسن واضح في الركلات الدورانية.', 'العمل على الدفاع المضاد قبل البطولة الجهوية.', v_coach, '{}'),
    (v_club, 'b0000000-0000-0000-0000-000000000002', (date_trunc('month', v_today) - interval '1 month')::date, 4, 5, 3, 4, 4,
      'دقة جيدة في البومسي، تحتاج إلى مزيد من التوازن.', 'إتقان بومسي Taegeuk 8.', v_coach, '{}'),
    (v_club, 'b0000000-0000-0000-0000-000000000001', (date_trunc('month', v_today) - interval '2 month')::date, 4, 4, 3, 3, 3,
      'بداية جيدة للموسم.', 'رفع اللياقة البدنية.', v_admin, '{}');
end $$;
