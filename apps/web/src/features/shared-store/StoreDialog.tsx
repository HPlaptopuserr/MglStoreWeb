"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export function StoreDialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      aria-label={title}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-100 bg-white px-6 py-4">
        <h2 className="text-lg font-bold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Хаах"
          className="flex size-11 items-center justify-center rounded-full bg-slate-50 transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-orange-600"
        >
          <X size={19} />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </dialog>
  );
}
