"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useI18n } from "@/lib/i18n/client";

export function QrDisplay({ url, code, open }: { url: string; code: string; open: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  // keep the live check-in counter fresh
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 10000);
    return () => clearInterval(id);
  }, [router]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={`rounded-full px-3 py-1 text-sm font-semibold ${open ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-700"}`}>
        {open ? "● " + t("checkinOpen") : t("checkinNotOpen")}
      </div>
      <div className="rounded-3xl bg-white p-5 shadow-lg">
        <QRCodeSVG value={url} size={260} level="M" marginSize={1} className="h-auto w-[min(70vw,320px)]" />
      </div>
      <div className="text-center">
        <div className="text-xs text-slate-500">{t("sessionCode")}</div>
        <div className="font-mono text-5xl font-black tracking-[0.25em] text-slate-900" dir="ltr">
          {code}
        </div>
      </div>
      <div className="no-print flex gap-2">
        <button
          type="button"
          className="btn-secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {}
          }}
        >
          {copied ? t("copied") : t("copy")}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
        >
          ⛶ {t("fullscreen")}
        </button>
      </div>
    </div>
  );
}
