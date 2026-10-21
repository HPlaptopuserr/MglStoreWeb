"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import styles from "./RestaurantDialog.module.css";

interface RestaurantDialogProps {
  title: string;
  subtitle?: string;
  amount?: string;
  busy: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** Native modal provides focus containment and blocks the cashier screen beneath it. */
export function RestaurantDialog({
  title,
  subtitle,
  amount,
  busy,
  onClose,
  children,
}: RestaurantDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus();
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-modal="true"
      aria-busy={busy}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className={`${styles.dialog} fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-hidden rounded-2xl p-0`}
    >
      <div className="flex max-h-[90dvh] flex-col">
        <header
          className={`${styles.header} flex shrink-0 items-start justify-between gap-3 p-5`}
        >
          <div>
            {subtitle && (
              <p className="text-xs font-semibold text-slate-400">{subtitle}</p>
            )}
            <h2 id={titleId} className="mt-1 text-lg font-bold">
              {title}
            </h2>
            {amount && (
              <div className="mt-4">
                <p className="text-[11px] font-medium text-slate-400">
                  Төлөх дүн
                </p>
                <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums text-sky-300">
                  {amount}
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            autoFocus
            disabled={busy}
            onClick={onClose}
            aria-label="Цонх хаах"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-white/10 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div
          className={`${styles.body} min-h-0 overflow-y-auto overscroll-contain p-5`}
        >
          {children}
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
