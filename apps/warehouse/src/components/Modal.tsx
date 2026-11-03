"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  size?: "md" | "lg";
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({
  title,
  description,
  onClose,
  children,
  size = "lg",
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className={`fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] ${size === "md" ? "max-w-xl" : "max-w-5xl"} overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm`}
    >
      <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-4 sm:p-6">
        <div>
          <h2
            id={titleId}
            className="text-xl font-bold tracking-tight sm:text-2xl"
          >
            {title}
          </h2>
          <p id={descriptionId} className="mt-2 text-sm text-slate-500">
            {description}
          </p>
        </div>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          aria-label={`${title} цонхыг хаах`}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </header>
      <div className="p-4 sm:p-6">{children}</div>
    </dialog>
  );
}
