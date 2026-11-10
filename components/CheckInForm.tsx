"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { selfCheckIn } from "@/app/actions/sessions";
import { useI18n } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dict";
import { formatClock } from "@/lib/time";
import { SubmitButton } from "./forms";
import { Alert } from "./ui";

type Detector = { detect: (src: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

function extractCode(text: string): string | null {
  try {
    const u = new URL(text);
    const c = u.searchParams.get("code");
    if (c) return c.toUpperCase();
  } catch {}
  const m = text.toUpperCase().match(/\b[A-Z0-9]{6}\b/);
  return m ? m[0] : null;
}

export function CheckInForm({ initialCode }: { initialCode?: string }) {
  const { t } = useI18n();
  const [state, action] = useActionState(selfCheckIn, null);
  const [code, setCode] = useState((initialCode ?? "").toUpperCase().slice(0, 6));
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState(false);
  const [canScan, setCanScan] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setCanScan(typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia);
  }, []);

  function stop() {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    setScanning(false);
  }
  useEffect(() => stop, []);

  async function startScan() {
    setCamError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setScanning(true);
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      const Ctor = (window as unknown as { BarcodeDetector: new (o: object) => Detector }).BarcodeDetector;
      const detector = new Ctor({ formats: ["qr_code"] });
      const loop = async () => {
        if (!streamRef.current) return;
        try {
          const found = await detector.detect(video);
          const c = found.length ? extractCode(found[0].rawValue) : null;
          if (c) {
            setCode(c);
            stop();
            setTimeout(() => formRef.current?.requestSubmit(), 50);
            return;
          }
        } catch {}
        requestAnimationFrame(loop);
      };
      loop();
    } catch {
      stop();
      setCamError(true);
    }
  }

  const ok = state?.ok;
  const err = state?.error;
  const opensAt = (state?.data?.opens_at as string) || "";

  return (
    <div className="space-y-4">
      {ok && (
        <div className="card flex flex-col items-center gap-2 border-green-200 bg-green-50 py-8 text-center">
          <div className="text-5xl">✅</div>
          <p className="text-lg font-bold text-green-800">{t(state!.message as DictKey)}</p>
          <Link href="/me" className="btn-secondary mt-2">
            {t("navHome")}
          </Link>
        </div>
      )}
      {err && <Alert kind={err === "ci_already" ? "info" : "error"}>{t(err as DictKey, { time: formatClock(opensAt) })}</Alert>}
      {!ok && (
        <form ref={formRef} action={action} className="card space-y-4">
          <p className="text-sm text-slate-600">{t("checkInHelp")}</p>
          <label className="label" htmlFor="code">
            {t("sessionCode")}
          </label>
          <input
            id="code"
            name="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            dir="ltr"
            placeholder="ABC123"
            required
            minLength={6}
            maxLength={6}
            className="input text-center font-mono text-3xl tracking-[0.3em]"
          />
          <SubmitButton pendingText={t("loading")}>{t("confirmAttendance")}</SubmitButton>
          {canScan && !scanning && (
            <button type="button" onClick={startScan} className="btn-secondary w-full">
              ▣ {t("scanQr")}
            </button>
          )}
          <video ref={videoRef} playsInline muted className={`w-full rounded-xl bg-black ${scanning ? "" : "hidden"}`} />
          {scanning && (
            <button type="button" onClick={stop} className="btn-secondary w-full">
              {t("stopScan")}
            </button>
          )}
          {camError && <Alert>{t("cameraUnavailable")}</Alert>}
        </form>
      )}
    </div>
  );
}
