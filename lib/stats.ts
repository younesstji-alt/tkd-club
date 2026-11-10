import type { Counts, ExpectedRow } from "./types";

export function emptyCounts(): Counts {
  return { expected: 0, present: 0, late: 0, absent: 0, excused: 0, upcoming: 0, rate: null };
}

/** Aggregate expected-attendance rows. Upcoming sessions are counted separately. */
export function countRows(rows: Pick<ExpectedRow, "effective_status">[]): Counts {
  const c = emptyCounts();
  for (const r of rows) {
    if (!r.effective_status) {
      c.upcoming++;
      continue;
    }
    c.expected++;
    c[r.effective_status]++;
  }
  const denom = c.expected - c.excused;
  c.rate = denom > 0 ? Math.round(((c.present + c.late) / denom) * 100) : null;
  return c;
}

export function groupBy<T, K extends string>(items: T[], key: (t: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const it of items) {
    const k = key(it);
    const arr = m.get(k);
    if (arr) arr.push(it);
    else m.set(k, [it]);
  }
  return m;
}

/** Map of session_id -> training type ids */
export function sessionTypeMap(rows: { session_id: string; training_type_id: string }[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const r of rows) {
    const arr = m.get(r.session_id);
    if (arr) arr.push(r.training_type_id);
    else m.set(r.session_id, [r.training_type_id]);
  }
  return m;
}
