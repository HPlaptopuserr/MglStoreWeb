"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface Props {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
  wide?: boolean;
}

export function PosDialog({
  title,
  description,
  children,
  onClose,
  busy = false,
  wide = false,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/40 backdrop:backdrop-blur-sm ${wide ? "max-w-4xl" : "max-w-2xl"}`}
    >
      <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
        <div>
          <h2 id={titleId} className="text-lg font-bold tracking-tight">
            {title}
          </h2>
          {description && (
            <p
              id={descriptionId}
              className="mt-1 text-xs leading-5 text-slate-500"
            >
              {description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Цонх хаах"
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-40"
        >
          <X size={18} />
        </button>
      </header>
      <div className="p-5 sm:p-6">{children}</div>
    </dialog>
  );
}
