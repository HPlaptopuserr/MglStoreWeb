"use client";

import { useState } from "react";
import { Crown, Loader2 } from "lucide-react";
import {
  DEFAULT_MEMBERSHIP_DURATION_MONTHS,
  MEMBERSHIP_DURATION_OPTIONS,
} from "./constants";
import {
  formatDate,
  isMembershipActive,
  membershipStatusText,
} from "./formatters";
import { updateUserMembership } from "./system-users.api";
import type { SystemUser, UpdateMembershipOptions } from "./types";

type MembershipMenuProps = {
  user: SystemUser;
  onChanged: () => void;
};

export function MembershipMenu({ user, onChanged }: MembershipMenuProps) {
  const [changingPrime, setChangingPrime] = useState(false);
  const [open, setOpen] = useState(false);
  const [durationMonths, setDurationMonths] = useState(
    String(DEFAULT_MEMBERSHIP_DURATION_MONTHS),
  );
  const [customExpiresAt, setCustomExpiresAt] = useState("");
  const activeMember = isMembershipActive(user);

  const updateMembership = async (
    isPrime: boolean,
    options?: UpdateMembershipOptions,
  ) => {
    setChangingPrime(true);
    try {
      await updateUserMembership(user.id, isPrime, options);
      setOpen(false);
      onChanged();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Membership эрх солиход алдаа гарлаа",
      );
    } finally {
      setChangingPrime(false);
    }
  };

  const grantMembership = () => {
    if (durationMonths === "custom") {
      if (!customExpiresAt) {
        alert("Дуусах огноо сонгоно уу");
        return;
      }
      updateMembership(true, { expiresAt: customExpiresAt });
      return;
    }

    const months = Number(durationMonths) || DEFAULT_MEMBERSHIP_DURATION_MONTHS;
    updateMembership(true, { durationMonths: months });
  };

  const selectedDurationLabel =
    durationMonths === "custom"
      ? customExpiresAt
        ? formatDate(customExpiresAt)
        : "Огноо сонгоно"
      : MEMBERSHIP_DURATION_OPTIONS.find(
          (option) => String(option.months) === durationMonths,
        )?.label || "1 сар";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setDurationMonths(String(DEFAULT_MEMBERSHIP_DURATION_MONTHS));
          setCustomExpiresAt("");
          setOpen((value) => !value);
        }}
        disabled={changingPrime}
        className={`inline-flex items-center gap-0.5 rounded-lg border px-2 py-0.5 text-[11px] font-semibold transition-colors disabled:opacity-60 ${
          activeMember
            ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
            : user.isPrime
              ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-amber-50 hover:text-amber-700"
              : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
        }`}
        title={
          activeMember
            ? "Membership хугацаа сунгах / цуцлах"
            : "Membership эрх өгөх"
        }
      >
        {changingPrime ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Crown className="h-3 w-3" />
        )}
        {activeMember ? "Member" : user.isPrime ? "Сунгах" : "Member болгох"}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-2xl border border-amber-200 bg-white p-3 shadow-xl">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-600">
              {activeMember ? "Member сунгах" : "Member хугацаа"}
            </p>
            {activeMember && (
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Одоогийн хугацаа: {membershipStatusText(user)}
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {MEMBERSHIP_DURATION_OPTIONS.map((option) => (
                <button
                  key={option.months}
                  type="button"
                  onClick={() => setDurationMonths(String(option.months))}
                  className={`rounded-xl border px-3 py-2 text-xs font-black transition ${
                    durationMonths === String(option.months)
                      ? "border-amber-400 bg-amber-50 text-amber-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setDurationMonths("custom")}
                className={`rounded-xl border px-3 py-2 text-xs font-black transition ${
                  durationMonths === "custom"
                    ? "border-amber-400 bg-amber-50 text-amber-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Огноо
              </button>
            </div>
            {durationMonths === "custom" && (
              <input
                type="date"
                value={customExpiresAt}
                onChange={(event) => setCustomExpiresAt(event.target.value)}
                className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
              />
            )}
            <button
              type="button"
              onClick={grantMembership}
              disabled={changingPrime}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-2.5 text-sm font-black text-white transition hover:bg-amber-600 disabled:opacity-60"
            >
              {changingPrime && <Loader2 className="h-4 w-4 animate-spin" />}
              {activeMember
                ? `${selectedDurationLabel}-ээр сунгах`
                : `${selectedDurationLabel}-ийн эрх олгох`}
            </button>
            {activeMember && (
              <button
                type="button"
                onClick={() => updateMembership(false)}
                disabled={changingPrime}
                className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
              >
                Member эрх цуцлах
              </button>
            )}
            {user.isPrime && !activeMember && (
              <p className="mt-2 text-xs font-semibold text-rose-500">
                Өмнөх member хугацаа дууссан байна.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
