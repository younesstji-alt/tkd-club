# نادي التايكوندو · Taekwondo Club App

A mobile-first PWA for running a Taekwondo club: training sessions, QR/code self check-in,
attendance corrections, monthly attendance reports and monthly coach evaluations.

- **Stack:** Next.js 15 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 · Supabase (Auth, Postgres, Storage, RLS)
- **Languages:** Arabic (RTL, default) and French; switchable from every screen
- **Timezone:** all dates and times are local to `Africa/Casablanca`

## Roles

| Role | Can do |
| --- | --- |
| **Admin / head coach** | Everything a coach can, plus: club settings, invite coaches/admins, change roles, deactivate members |
| **Coach** | Create/edit/cancel sessions, show the QR code, correct attendance, manage athletes and training types, write evaluations, view reports |
| **Athlete** | See their own profile, training types, schedule, attendance history and evaluations; check in with the QR or the 6-character code |

Privacy is enforced in the database with row-level security (RLS), not only in the UI:
athletes can read only their own athlete row, attendance and evaluations; weight and
evaluations are visible only to that athlete and to staff in the same club; session
check-in codes are visible to staff only, so athletes have to be at the session to see them.

## Screens

- Login, first-run club registration, invitation sign-up (`/invite/<token>`)
- Coach dashboard: today's sessions with live check-in counts, month summary, evaluations progress
- Sessions: upcoming/past list, create (with weekly repeat), edit, cancel/complete, details with attendance roster and change log
- QR check-in screen (full screen, live counter, regenerate code)
- Athlete check-in: auto-filled from the QR link, typed code, or in-app scanner (Android Chrome)
- Athletes: list with this month's attendance rate, profile (photo, belt, weight, category, training types, weekly target), month stats, breakdown by training type, calendar, session-by-session history
- Monthly reports filtered by month / athlete / training type, CSV export (Excel-friendly UTF-8) and print-to-PDF
- Monthly evaluation form (1–5 for discipline, effort, fitness, technique, progress; private comment; next-month goal) with an automatic attendance summary, and month-to-month history with ▲/▼ comparison
- Settings: club name, check-in window, late threshold, default language, training types, members and invitations

## How attendance is counted

- An athlete is **expected** at a session when the session is not cancelled, the athlete is active and joined on or before that date, and the session shares a training type with the athlete (a session with no type is for everyone). An athlete who attended a session they were not expected at is counted too.
- **Self check-in** works only between `start − opens_before` and `start + closes_after` (club settings). After `start + late_after` it is recorded as **late**. A unique constraint on (session, athlete) prevents duplicate check-ins.
- Once a session is completed or over, an expected athlete without a record counts as **absent**.
- **Cancelled sessions are excluded** from all totals.
- **Attendance rate** = (present + late) ÷ (expected − excused).
- Every manual addition, correction or removal by a coach is written to `attendance_changes` (who, when, old → new, optional reason) and shown on the session page.
- Evaluations are always entered by a coach; the app never ranks athletes or rates them automatically from attendance.

## Setup

### 1. Requirements

- Node.js 20+ (tested with Node 22)
- A Supabase project (free tier is fine): <https://supabase.com/dashboard>
- Optional, for local development: Docker and the Supabase CLI (`npx supabase`)

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` / publishable key |
| `NEXT_PUBLIC_SITE_URL` | Public URL of the deployed app, e.g. `https://tkd.example.com` (used in QR codes and invite links). If empty it is taken from the request host. |

No service-role key is needed: everything runs as the signed-in user under RLS.

### 3. Database

**Hosted Supabase (SQL editor):**

1. Open SQL Editor and run `supabase/migrations/20261109000000_init.sql` (tables, view, functions, RLS, storage bucket and policies).
2. Optional, demo data only: run `supabase/seed.sql`. Skip it for your real club.

**Or with the Supabase CLI:**

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push            # applies the migration
```

**Auth settings (Supabase → Authentication):**

- URL Configuration → Site URL: your app URL; add `https://<your-domain>/auth/callback` to Redirect URLs.
- Email provider: keep "Confirm email" on (users get a confirmation link that returns to `/auth/callback`) or turn it off so invited users can sign in immediately.
- For real e-mail delivery set up custom SMTP (Supabase's built-in sender is rate-limited). Invitation links themselves are shared by the coach (copy or WhatsApp button), so they don't depend on e-mail.

### 4. Run

```bash
npm install
npm run dev        # http://localhost:3000
# or
npm run build && npm start
```

### 5. First use

- **Real club (no seed):** open `/login` → "First-time club setup" → enter club name, your name, e-mail and password. You become the admin / head coach, and four default training types are created (Kyorugi, Poomsae, general Taekwondo, fitness). The first-run page is disabled once a club exists.
- Add athletes (**Athletes → New athlete**). They do not need an account.
- Invite coaches (**Settings → Members and invitations**) and athletes (same page, or the **Invite to app** tab on an athlete's profile). Share the link; the person signs up with the invited e-mail and is linked automatically.
- Create sessions, open **Show QR** on a tablet or phone at the dojang, and athletes scan it with their camera.

### Local development with the demo data

```bash
npx supabase start           # needs Docker; prints the local URL and anon key
npx supabase db reset        # applies migration + seed
cp .env.example .env.local   # use http://127.0.0.1:54321 and the printed anon key
npm run dev
```

Demo accounts (password `Demo1234!`):

| E-mail | Role |
| --- | --- |
| `admin@demo.tkd` | Admin / head coach |
| `coach@demo.tkd` | Coach |
| `yassine@demo.tkd` | Athlete |
| `salma@demo.tkd` | Athlete |

The seed generates about seven weeks of sessions around today's date, attendance, evaluations
and a session that started 5 minutes before the seed ran with check-in code **TKD123**, so you
can try a check-in right away (re-run `db reset` to move it to "now").

## Database schema

| Table | Purpose |
| --- | --- |
| `clubs` | Club name, timezone, default language, check-in window (`checkin_opens_before_min`, `checkin_closes_after_min`, `late_after_min`) |
| `profiles` | One per auth user: club, role (`admin`/`coach`/`athlete`), name, language, active |
| `training_types` | Per-club class types (Arabic + French name, color, active) |
| `athletes` | Athlete profile; optional link to a login (`profile_id`); private weight fields |
| `athlete_training_types` | Athlete ↔ training type |
| `sessions` | Date, start/end time, location, notes, status (`scheduled`/`completed`/`cancelled`) |
| `session_training_types` | Session ↔ training type |
| `session_codes` | 6-character check-in code per session (staff-only) |
| `attendance` | One row per (session, athlete): status, method (`self`/`manual`), check-in time, note |
| `attendance_changes` | Audit log of manual changes |
| `evaluations` | One per (athlete, month): five 1–5 ratings, comment, next goal, attendance snapshot |
| `invitations` | E-mail, role, optional athlete link, token, expiry |
| view `attendance_expected` | Expected (session, athlete) pairs with effective status; uses the caller's RLS |

Key functions: `check_in(code)`, `accept_invitation(token)`, `invitation_info(token)`,
`regenerate_session_code(session_id)`, `admin_set_member(...)`, and the `handle_new_user`
trigger that applies an invitation (or creates the first club) on sign-up.

Athlete photos are stored in the private `athlete-photos` bucket as `<club_id>/<athlete_id>.<ext>`
and served through short-lived signed URLs.

## Deploying

Any Node host works; Vercel is the simplest: import the project, set the three environment
variables, deploy, then put the deployed URL in Supabase's Site URL / Redirect URLs and in
`NEXT_PUBLIC_SITE_URL`. HTTPS is required for installing the PWA and for the in-app camera scanner.

## Known limits

- One club per deployment is the intended setup (the schema is multi-club, but self-service club creation is limited to the very first sign-up).
- The in-app QR scanner uses the browser's `BarcodeDetector` (Chrome on Android). On iPhone, athletes scan with the Camera app, which opens the check-in link, or they type the code.
- PDF export uses the browser's "Print → Save as PDF", which keeps Arabic text shaping correct.
- The service worker caches only static assets and an offline page; attendance always needs a connection.
