"use client";
import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import type { ActionState } from "@/lib/types";
import type { DictKey } from "@/lib/i18n/dict";
import { Alert } from "./ui";

const PendingCtx = createContext(false);

export function SubmitButton({
  children,
  className = "btn-primary w-full",
  pendingText,
  name,
  value,
  confirm,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  name?: string;
  value?: string;
  confirm?: string;
}) {
  const status = useFormStatus();
  const ctxPending = useContext(PendingCtx);
  const pending = status.pending || ctxPending;
  const { t } = useI18n();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      aria-busy={pending}
      className={className}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending && <Spinner />}
      {pending ? (pendingText ?? t("saving")) : children}
    </button>
  );
}

export function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />;
}

/**
 * Wraps a server action using useActionState and shows its error / success message.
 * Server actions return { error: DictKey } or { ok: true, message?: DictKey }.
 */
export function ActionForm({
  action,
  children,
  className = "space-y-4",
  resetOnSuccess = false,
  onSuccess,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  onSuccess?: (s: ActionState) => void;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const { t } = useI18n();
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      if (typeof state.data?.redirect === "string") router.push(state.data.redirect);
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.(state);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    // onSubmit (instead of the action prop) keeps the user's input when the server returns an error
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => formAction(fd));
      }}
    >
      <PendingCtx.Provider value={isPending}>
      {state?.error && <Alert>{t(state.error as DictKey) || state.error}</Alert>}
      {state?.ok && state.message && (
        <Alert kind="success">{t(state.message as DictKey, state.data as Record<string, string | number>)}</Alert>
      )}
      {children}
      </PendingCtx.Provider>
    </form>
  );
}

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
