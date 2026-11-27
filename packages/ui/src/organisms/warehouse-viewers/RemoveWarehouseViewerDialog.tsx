"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { WarehouseViewerMember } from "@mgl/types";

interface RemoveWarehouseViewerDialogProps {
  member: WarehouseViewerMember;
  onClose: () => void;
  onConfirm: () => Promise<boolean>;
}

export function RemoveWarehouseViewerDialog({
  member,
  onClose,
  onConfirm,
}: RemoveWarehouseViewerDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const expected = member.phoneNumber?.trim() || member.fullName.trim();
  const confirmed = expected.length > 0 && confirmation.trim() === expected;

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    cancelButton.current?.focus();
    return () => element?.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        if (!inFlight.current) onClose();
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl backdrop:bg-slate-950/40 sm:p-6"
    >
      <span className="inline-flex rounded-xl bg-red-50 p-3 text-red-600">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </span>
      <h2 id={titleId} className="mt-4 text-lg font-semibold">
        Харах эрх цуцлах
      </h2>
      <p id={descriptionId} className="mt-2 text-sm leading-6 text-slate-600">
        <strong className="break-words text-slate-900">
          {member.fullName}
        </strong>{" "}
        энэ дэлгүүрийн тайланг харах эрхгүй болно. Цуцлахын өмнө тухайн хүний
        {member.phoneNumber?.trim() ? " утасны дугаарыг" : " бүтэн нэрийг"}{" "}
        оруулж баталгаажуулна уу.
      </p>
      <p className="mt-4 break-all rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold tabular-nums">
        {expected}
      </p>
      <form
        className="mt-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!confirmed || inFlight.current) return;
          inFlight.current = true;
          setSubmitting(true);
          setError("");
          try {
            if (!(await onConfirm())) {
              setError("Эрхийг цуцалж чадсангүй. Дахин оролдоно уу.");
            }
          } catch {
            setError("Эрхийг цуцалж чадсангүй. Дахин оролдоно уу.");
          } finally {
            inFlight.current = false;
            setSubmitting(false);
          }
        }}
      >
        <label className="block text-xs font-semibold text-slate-600">
          {member.phoneNumber?.trim()
            ? "Баталгаажуулах утасны дугаар"
            : "Баталгаажуулах бүтэн нэр"}
          <input
            type="text"
            inputMode={member.phoneNumber?.trim() ? "tel" : "text"}
            autoComplete="off"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            disabled={submitting}
            required
            className="mt-2 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
          />
        </label>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            ref={cancelButton}
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="min-h-11 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
          >
            Болих
          </button>
          <button
            type="submit"
            disabled={!confirmed || submitting}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting && (
              <Loader2
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            )}
            {submitting ? "Цуцалж байна…" : "Баталгаажуулж цуцлах"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
