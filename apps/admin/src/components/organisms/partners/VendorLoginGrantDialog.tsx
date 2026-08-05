"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Loader2, ShieldCheck, X } from "lucide-react";
import { VendorLoginAccountSelector } from "./VendorLoginAccountSelector";
import type {
  PersonalAccountOption,
  VendorLoginRole,
} from "./vendor-login-types";

type Props = {
  memberCount: number;
  error: string;
  notice: string;
  selectedAccount: PersonalAccountOption | null;
  role: VendorLoginRole;
  disabledUserIds: string[];
  submittedEmail: string;
  isSubmitting: boolean;
  canSubmit: boolean;
  onSelectedAccountChange: (account: PersonalAccountOption | null) => void;
  onRoleChange: (role: VendorLoginRole) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function VendorLoginGrantDialog({
  memberCount,
  error,
  notice,
  selectedAccount,
  role,
  disabledUserIds,
  submittedEmail,
  isSubmitting,
  canSubmit,
  onSelectedAccountChange,
  onRoleChange,
  onSubmit,
  onClose,
}: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const isSubmittingRef = useRef(isSubmitting);
  onCloseRef.current = onClose;
  isSubmittingRef.current = isSubmitting;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmittingRef.current) {
        onCloseRef.current();
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-slate-950/55 backdrop-blur-sm"
        onClick={isSubmitting ? undefined : onClose}
        aria-label="Popup хаах"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl outline-none sm:max-h-[calc(100dvh-3rem)]"
      >
        <header className="shrink-0 border-b border-indigo-100 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 px-5 py-4 text-white sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 shadow-inner">
                <ShieldCheck size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 id={titleId} className="text-lg font-black">
                  Login эрх олгох
                </h2>
                <p className="mt-1 text-xs font-semibold leading-5 text-indigo-100">
                  Personal account сонгож байгууллагын Vendor portal эрх болон page role онооно.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Popup хаах"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {error ? (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              <p>{error}</p>
              <p className="mt-1 text-xs font-medium leading-5 text-red-600">
                Оруулсан login email: {submittedEmail.trim() || "хоосон"}
              </p>
            </div>
          ) : null}

          {notice ? (
            <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
              <p>{notice}</p>
              <p className="mt-1 text-xs font-medium leading-5 text-emerald-700">
                “Нэвтрэх боломжтой user-үүд” хэсгийн мэдээллийг серверээс шинэчиллээ.
              </p>
            </div>
          ) : null}

          <VendorLoginAccountSelector
            selectedAccount={selectedAccount}
            onSelectedAccountChange={onSelectedAccountChange}
            role={role}
            onRoleChange={onRoleChange}
            disabledUserIds={disabledUserIds}
            title="Vendor login эрх шинээр олгох"
            description="Personal account сонгож энэ байгууллагын page role онооно."
            badge={memberCount === 0 ? "First owner" : "Additional user"}
            autoFocus
          />
        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs font-semibold leading-5 text-slate-500">
            Сонгосон account-аар login email эсвэл утсаа ашиглан нэвтэрнэ.
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:opacity-50"
            >
              Болих
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit || isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <ShieldCheck size={16} aria-hidden="true" />
              )}
              Эрх олгох
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
