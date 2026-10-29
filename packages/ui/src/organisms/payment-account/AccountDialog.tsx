"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./AccountDialog.module.css";
import { CreditCard, X } from "lucide-react";

export function AccountDialog({
  children,
  footer,
  busy,
  onClose,
}: {
  children: ReactNode;
  footer: ReactNode;
  busy: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className={`${styles.dialog} fixed inset-0 m-auto h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-hidden border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm sm:h-auto sm:max-h-[90dvh] sm:w-[calc(100%_-_3rem)] sm:max-w-3xl sm:rounded-3xl`}
    >
      <div className="flex h-full max-h-[100dvh] flex-col sm:h-auto sm:max-h-[90dvh]">
        <header className="flex shrink-0 items-start gap-3 border-b border-slate-100 bg-white px-5 py-5 sm:px-7">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <CreditCard className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
              MINU DYNAMIC QR
            </p>
            <h2
              id={titleId}
              className="text-lg font-bold tracking-tight sm:text-xl"
            >
              Төлбөрийн данс холбох
            </h2>
            <p
              id={descriptionId}
              className="mt-1 text-xs leading-relaxed text-slate-500"
            >
              Төлбөр хүлээн авах дансаа бүртгэж, нэг дор удирдаарай.
            </p>
          </div>
          <button
            type="button"
            autoFocus
            disabled={busy}
            onClick={onClose}
            aria-label="Данс холбох цонхыг хаах"
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50/80 px-5 py-5 sm:px-7">
          {children}
        </div>
        <footer className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-7">
          {footer}
        </footer>
      </div>
    </dialog>,
    document.body,
  );
}
