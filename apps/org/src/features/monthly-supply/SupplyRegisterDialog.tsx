"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type Props = {
  title: string;
  month: string;
  editing: boolean;
  saving: boolean;
  canSave: boolean;
  error: string;
  onClose: () => void;
  children: ReactNode;
};

export function SupplyRegisterDialog({
  title,
  month,
  editing,
  saving,
  canSave,
  error,
  onClose,
  children,
}: Props) {
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
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50"
    >
      <div className="flex max-h-[90dvh] flex-col">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-bold">
              {title} · Бүртгэл
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {month} ·{" "}
              {editing ? "Орлого, үнэ, зарцуулалтын бүртгэл" : "Харах горим"}
            </p>
          </div>
          <button
            type="button"
            autoFocus
            disabled={saving}
            aria-label="Бүртгэлийн цонх хаах"
            onClick={onClose}
            className="flex size-10 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:opacity-40"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>
        {error && (
          <p
            role="alert"
            className="shrink-0 border-b border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-800"
          >
            {error}
          </p>
        )}
        <div className="min-h-0 overflow-y-auto overscroll-contain [&_td]:border [&_td]:border-slate-200 [&_th]:border [&_th]:border-slate-300">
          {children}
        </div>
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3">
          <p className="text-xs text-slate-500">
            {editing
              ? "Өөрчлөлтүүд сарын хангамжтай хамт хадгалагдана."
              : "Мэдээлэл өөрчлөхийн тулд үндсэн хүснэгтийн «Засах» товчийг дарна уу."}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="min-h-10 rounded-md border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50 disabled:opacity-40"
            >
              Хаах
            </button>
            {editing && (
              <button
                type="submit"
                form="monthly-supply-form"
                disabled={!canSave || saving}
                className="min-h-10 rounded-md bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-40"
              >
                {saving ? "Хадгалж байна…" : "Сарын хангамж хадгалах"}
              </button>
            )}
          </div>
        </footer>
      </div>
    </dialog>,
    document.body,
  );
}
