"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import type { AdminSalesStore } from "@/lib/admin-sales-stores-api";
import { SalesStoreDetails } from "./SalesStoreDetails";

export function SalesStoreDetailsDialog({
  id,
  store,
  onDismiss,
}: {
  id: string;
  store: AdminSalesStore;
  onDismiss: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const backdropPointerDown = useRef(false);
  const headingId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    headingRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      id={id}
      aria-labelledby={headingId}
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
      onPointerDown={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        backdropPointerDown.current =
          event.target === event.currentTarget &&
          (event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom);
      }}
      onClick={(event) => {
        if (backdropPointerDown.current && event.target === event.currentTarget)
          onDismiss();
        backdropPointerDown.current = false;
      }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm"
    >
      <div className="flex max-h-[90dvh] flex-col">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-semibold text-lime-700">
              MGL Store-ууд
            </p>
            <h2
              ref={headingRef}
              tabIndex={-1}
              id={headingId}
              className="break-words text-xl font-bold outline-none"
            >
              {store.name} — дэлгэрэнгүй
            </h2>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Дэлгэрэнгүй цонхыг хаах"
            className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-lime-600"
          >
            <X aria-hidden="true" className="h-5 w-5" />
            Хаах
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain">
          <SalesStoreDetails store={store} />
        </div>
      </div>
    </dialog>
  );
}
