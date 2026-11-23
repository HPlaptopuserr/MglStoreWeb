"use client";

import { useEffect, useRef, useState } from "react";
import { useRegisteredCreditBorrower } from "../hooks/useRegisteredCreditBorrower";
import {
  linkExistingCreditBorrower,
  type ExpectedCreditBorrowerLink,
} from "../api/link-existing-credit-borrower";
import {
  registeredBorrowerPhone,
  verifiedCreditBorrower,
} from "../utils/registered-credit-borrower";
import { formatMoney } from "../utils/pos-display-format";

export type LegacyCreditBorrowerLinkDialogProps = {
  organizationId: string;
  creditSaleIds: string[];
  expectedCredits: ExpectedCreditBorrowerLink[];
  borrowerName: string;
  borrowerPhone: string | null;
  totalDue: number;
  targetType: "CUSTOMER" | "COMPANY";
  companyName?: string;
  onClose: () => void;
  onLinked: () => void;
};

export function LegacyCreditBorrowerLinkDialog({
  organizationId,
  creditSaleIds,
  expectedCredits,
  borrowerName,
  borrowerPhone,
  totalDue,
  targetType,
  companyName: initialCompanyName,
  onClose,
  onLinked,
}: LegacyCreditBorrowerLinkDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [phone, setPhone] = useState(borrowerPhone || "");
  const [companyName, setCompanyName] = useState(
    initialCompanyName || (targetType === "COMPANY" ? borrowerName : ""),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const lookup = useRegisteredCreditBorrower(organizationId);
  const user = verifiedCreditBorrower(lookup.state, organizationId, phone);
  const operation = useRef<AbortController | null>(null);
  const valid = Boolean(
    user &&
    creditSaleIds.length &&
    expectedCredits.length === creditSaleIds.length &&
    (targetType !== "COMPANY" || companyName.trim()),
  );
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      operation.current?.abort();
      element?.close();
    };
  }, []);
  const link = async () => {
    if (!valid || !user || saving || operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    setSaving(true);
    setError("");
    try {
      await linkExistingCreditBorrower(
        {
          organizationId,
          creditSaleIds,
          expectedCredits,
          borrowerUserId: user.id,
          borrowerPhone: user.phoneNumber,
          ...(targetType === "COMPANY"
            ? { companyName: companyName.trim() }
            : {}),
        },
        controller.signal,
      );
      if (!controller.signal.aborted) onLinked();
    } catch (cause: unknown) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : "Зээлийг холбож чадсангүй. Жагсаалтаа шинэчилж шалгана уу.",
        );
    } finally {
      if (!controller.signal.aborted) setSaving(false);
      if (operation.current === controller) operation.current = null;
    }
  };
  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
      aria-labelledby="legacy-credit-link-title"
      aria-busy={saving}
      className="m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl backdrop:bg-slate-950/50"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void link();
        }}
        className="space-y-4"
      >
        <h2 id="legacy-credit-link-title" className="text-lg font-black">
          Одоогийн зээлийг MGL бүртгэлд холбох
        </h2>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="font-bold">{borrowerName}</p>
          <p className="mt-1 text-slate-600">
            Одоогийн утас: {borrowerPhone || "Бүртгэгдээгүй"}
          </p>
          <p className="mt-1 text-slate-600">
            Сонгосон зээл: {creditSaleIds.length} · Үлдэгдэл:{" "}
            <strong>{formatMoney(totalDue)}</strong>
          </p>
        </div>
        <p className="text-sm text-slate-600">
          Зөв хүний MGL бүртгэлтэй утсыг шалгаад холбож баталгаажуулна. Зээлийн
          дүн, төлөлт болон төлөв өөрчлөгдөхгүй.
        </p>
        <fieldset disabled={saving} className="space-y-3">
          <label
            className="block text-sm font-semibold"
            htmlFor="legacy-credit-link-phone"
          >
            Холбох хүний MGL-д бүртгэлтэй утас
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="legacy-credit-link-phone"
              type="tel"
              inputMode="tel"
              autoFocus
              value={phone}
              onChange={(event) => {
                lookup.invalidate();
                setPhone(event.target.value);
                setError("");
              }}
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-3 outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200"
            />
            <button
              type="button"
              onClick={() => void lookup.lookup(phone)}
              disabled={
                lookup.state.status === "loading" ||
                !registeredBorrowerPhone(phone)
              }
              className="rounded-xl border border-blue-300 px-3 py-3 text-sm font-bold text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {lookup.state.status === "loading"
                ? "Шалгаж байна…"
                : "MGL хэрэглэгч шалгах"}
            </button>
          </div>
          {targetType === "COMPANY" && (
            <label className="block text-sm font-semibold">
              Байгууллагын нэр
              <input
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                maxLength={200}
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200"
              />
            </label>
          )}
        </fieldset>
        {lookup.state.status === "loading" && (
          <p role="status" className="text-sm text-slate-500">
            MGL хэрэглэгчийн мэдээлэл ачаалж байна…
          </p>
        )}
        {lookup.state.status === "error" && (
          <p role="alert" className="text-sm text-red-700">
            {lookup.state.message}
          </p>
        )}
        {lookup.state.status === "empty" && (
          <p role="status" className="text-sm text-amber-700">
            Энэ дугаартай идэвхтэй MGL хэрэглэгч олдсонгүй. Дугаарыг зөв эсэхийг
            шалгана уу. Нэр төстэй хэрэглэгчийг автоматаар сонгохгүй.
          </p>
        )}
        {user && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
          >
            <p className="font-bold">Холбох MGL хэрэглэгч: {user.fullName}</p>
            <p className="mt-1">
              {user.phoneNumber}
              {user.email ? ` · ${user.email}` : ""}
            </p>
            {targetType === "COMPANY" && (
              <p className="mt-1">
                Энэ хүнийг байгууллагын хариуцсан ажилтнаар холбоно.
              </p>
            )}
          </div>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        <p className="text-xs text-slate-500">
          Энэ үйлдэл зөвхөн сонгосон зээлийн холбоосыг засна. MGL хэрэглэгчийн
          үндсэн утас болон бусад зээл автоматаар өөрчлөгдөхгүй.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-300 px-4 py-2 font-semibold disabled:opacity-50"
          >
            Буцах
          </button>
          <button
            type="submit"
            disabled={!valid || saving}
            className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Холбож байна…" : "MGL бүртгэлд холбох"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
