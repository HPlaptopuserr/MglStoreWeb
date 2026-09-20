"use client";

import { useEffect, useId, useRef } from "react";
import { Loader2 } from "lucide-react";
import type { VendorLoginMember } from "./vendor-login-types";

interface Props {
  member: VendorLoginMember;
  currentOwner?: VendorLoginMember;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function VendorOwnerDialog({
  member,
  currentOwner,
  busy,
  error,
  onCancel,
  onConfirm,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl backdrop:bg-slate-950/40"
    >
      <h2 id={titleId} className="text-lg font-bold text-slate-950">
        Дэлгүүрийн эзэмшигч солих
      </h2>
      <div
        id={descriptionId}
        className="mt-3 space-y-2 text-sm leading-6 text-slate-600"
      >
        <p>
          <strong className="text-slate-950">
            {member.fullName || member.email}
          </strong>{" "}
          хэрэглэгч дэлгүүрийн бүх эрхийг удирдах эзэмшигч болно.
        </p>
        {currentOwner && (
          <p>
            Одоогийн эзэмшигч {currentOwner.fullName || currentOwner.email}{" "}
            Admin эрхтэй болно.
          </p>
        )}
      </div>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
        >
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          autoFocus
          disabled={busy}
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-50"
        >
          Болих
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
        >
          {busy && (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          )}
          {busy ? "Хадгалж байна…" : "Эзэмшигч болгох"}
        </button>
      </div>
    </dialog>
  );
}
