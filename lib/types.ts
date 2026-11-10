export type Role = "admin" | "coach" | "athlete";
export type SessionStatus = "scheduled" | "completed" | "cancelled";
export type AttendanceStatus = "present" | "late" | "absent" | "excused";
export const ATTENDANCE_STATUSES: AttendanceStatus[] = ["present", "late", "absent", "excused"];
export const RATING_KEYS = ["discipline", "effort", "fitness", "technique", "progress"] as const;
export type RatingKey = (typeof RATING_KEYS)[number];

export interface Club {
  id: string;
  name: string;
  timezone: string;
  default_language: "ar" | "fr";
  checkin_opens_before_min: number;
  checkin_closes_after_min: number;
  late_after_min: number;
}

export interface Profile {
  id: string;
  club_id: string;
  role: Role;
  full_name: string;
  email: string | null;
  language: "ar" | "fr" | null;
  active: boolean;
}

export interface TrainingType {
  id: string;
  name_ar: string;
  name_fr: string;
  color: string;
  active: boolean;
  sort_order: number;
}

export interface Athlete {
  id: string;
  club_id: string;
  profile_id: string | null;
  full_name: string;
  photo_path: string | null;
  belt: string | null;
  weight_kg: number | null;
  weight_updated_on: string | null;
  weight_category: string | null;
  weekly_target: number | null;
  date_of_birth: string | null;
  joined_on: string;
  active: boolean;
}

export interface Session {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  notes: string | null;
  status: SessionStatus;
}

export interface ExpectedRow {
  session_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  session_status: SessionStatus;
  athlete_id: string;
  recorded_status: AttendanceStatus | null;
  checked_in_at: string | null;
  method: "self" | "manual" | null;
  effective_status: AttendanceStatus | null;
}

export interface Evaluation {
  id: string;
  athlete_id: string;
  month: string;
  discipline: number;
  effort: number;
  fitness: number;
  technique: number;
  progress: number;
  comment: string | null;
  next_goal: string | null;
  attendance_summary: Partial<Counts>;
  coach_id: string | null;
  updated_at: string;
}

export interface Counts {
  expected: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  upcoming: number;
  rate: number | null;
}

export type ActionState = { ok?: boolean; error?: string; message?: string; data?: Record<string, unknown> } | null;
