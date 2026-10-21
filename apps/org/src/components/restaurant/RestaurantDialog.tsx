"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

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
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-950/80 backdrop:backdrop-blur-sm"
    >
      <div className="flex max-h-[90dvh] flex-col">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            {subtitle && <p className="text-xs font-semibold text-slate-500">{subtitle}</p>}
            <h2 id={titleId} className="mt-1 text-lg font-bold">
              {title}
            </h2>
            {amount && <p className="mt-2 text-2xl font-black tabular-nums text-sky-700">{amount}</p>}
          </div>
          <button
            type="button"
            autoFocus
            disabled={busy}
            onClick={onClose}
            aria-label="Цонх хаах"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-white/10 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-4">
          {children}
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
