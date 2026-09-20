"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function EmployeeDialog({
  title,
  description,
  busy = false,
  onClose,
  children,
  footer,
}: {
  title: string;
  description: string;
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    element?.showModal();
    element?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/40 backdrop:backdrop-blur-sm"
    >
      <div className="flex max-h-[92dvh] flex-col">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
          <div>
            <h2 id={titleId} className="text-xl font-bold tracking-tight">
              {title}
            </h2>
            <p
              id={descriptionId}
              className="mt-1.5 text-sm leading-6 text-slate-500"
            >
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Цонх хаах"
            className="-mr-2 flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-40"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-6 sm:px-7">
          {children}
        </div>
        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-7">
          {footer}
        </footer>
      </div>
    </dialog>
  );
}
