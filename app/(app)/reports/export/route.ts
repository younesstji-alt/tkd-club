import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildMonthlyReport } from "@/lib/report";
import { getLang } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n/dict";
import { currentMonth, isValidMonth } from "@/lib/time";

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || profile.role === "athlete") return new NextResponse("Forbidden", { status: 403 });

  const sp = req.nextUrl.searchParams;
  const m = sp.get("month");
  const month = isValidMonth(m) ? m : currentMonth();
  const lang = await getLang();
  const t = (k: Parameters<typeof translate>[1]) => translate(lang, k);
  const report = await buildMonthlyReport(supabase, {
    month,
    athleteId: sp.get("athlete") || undefined,
    typeId: sp.get("type") || undefined,
  });

  const header = [t("athlete"), t("belt"), t("expected"), t("att_present"), t("att_late"), t("att_absent"), t("att_excused"), t("rate")];
  const lines = [header.map(csvCell).join(",")];
  for (const r of report.list) {
    const c = r.counts;
    lines.push([r.name, r.belt, c.expected, c.present, c.late, c.absent, c.excused, c.rate === null ? "" : `${c.rate}%`].map(csvCell).join(","));
  }
  const c = report.totals;
  lines.push([t("clubTotals"), "", c.expected, c.present, c.late, c.absent, c.excused, c.rate === null ? "" : `${c.rate}%`].map(csvCell).join(","));

  // BOM so Excel opens Arabic text as UTF-8
  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendance-${month}.csv"`,
    },
  });
}
