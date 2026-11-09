"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type Props = {
  title: string;
  subtitle: string;
  onClose: () => void;
  footer: ReactNode;
  children: ReactNode;
};

/** Keep customer checkout controls visible while bank choices/cart items scroll. */
export function QrMenuDialog({
  title,
  subtitle,
  onClose,
  footer,
  children,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    const dialog = ref.current;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_1rem)] max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-950 shadow-2xl backdrop:bg-slate-950/50"
    >
      <div className="flex max-h-[90dvh] flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <p className="text-xs font-medium text-slate-500">{subtitle}</p>
            <h2 id={titleId} className="mt-1 text-lg font-bold">
              {title}
            </h2>
          </div>
          <button
            type="button"
            autoFocus
            aria-label="Цонх хаах"
            onClick={onClose}
            className="grid min-h-11 min-w-11 place-items-center rounded-full bg-slate-100 text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {children}
        </div>
        <footer
          className="shrink-0 border-t border-slate-100 bg-white p-4"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          {footer}
        </footer>
      </div>
    </dialog>,
    document.body,
  );
}
