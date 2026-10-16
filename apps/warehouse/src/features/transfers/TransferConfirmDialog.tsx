"use client";
import { useEffect, useRef } from "react";
export function TransferConfirmDialog({
  title,
  description,
  busy,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="transfer-confirm-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl p-6 shadow-xl backdrop:bg-slate-950/40"
    >
      <h2 id="transfer-confirm-title" className="text-lg font-bold">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          autoFocus
          disabled={busy}
          onClick={onClose}
          className="rounded-lg border border-slate-200 px-4 py-2 hover:bg-slate-50 disabled:opacity-50"
        >
          Буцах
        </button>
        <button
          disabled={busy}
          onClick={onConfirm}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? "Боловсруулж байна…" : "Зөвшөөрөх"}
        </button>
      </div>
    </dialog>
  );
}
