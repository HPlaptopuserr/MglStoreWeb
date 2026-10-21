"use client";

import { useId } from "react";
import { BadgePercent, Loader2, X } from "lucide-react";
import type { CafeRegularCustomer } from "@/lib/restaurant-pos-api";

interface RestaurantEmployeeDiscountProps {
  customer: CafeRegularCustomer | null;
  phone: string;
  loading: boolean;
  disabled: boolean;
  error: string;
  onPhoneChange: (phone: string) => void;
  onCheck: () => void;
  onRemove: () => void;
}

export function RestaurantEmployeeDiscount({
  customer,
  phone,
  loading,
  disabled,
  error,
  onPhoneChange,
  onCheck,
  onRemove,
}: RestaurantEmployeeDiscountProps) {
  const phoneId = useId();
  const errorId = useId();
  const canCheck = phone.length === 8 && !loading && !disabled;
  return (
    <section
      aria-label="Ажилтны хөнгөлөлт"
      className="mb-4 rounded-xl border border-emerald-300/25 bg-emerald-300/5 p-3"
    >
      <h3 className="flex items-center gap-2 text-xs font-bold text-emerald-200">
        <BadgePercent aria-hidden="true" className="h-4 w-4" />
        Ажилтны хөнгөлөлт
      </h3>
      {customer ? (
        <div
          className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-emerald-300/10 p-3"
          role="status"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-emerald-100">
              {customer.name}
            </p>
            <p className="mt-1 text-xs text-emerald-200/80">
              {customer.phone} · {customer.discountPercent}%
            </p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled || loading}
            aria-label="Ажилтны хөнгөлөлтийг салгах"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-emerald-300/30 text-emerald-200 transition hover:bg-emerald-300/10 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <label
            htmlFor={phoneId}
            className="mb-1.5 block text-xs text-slate-300"
          >
            Ажилтны утасны дугаар
          </label>
          <div className="flex gap-2">
            <input
              id={phoneId}
              inputMode="numeric"
              maxLength={8}
              value={phone}
              onChange={(event) =>
                onPhoneChange(event.target.value.replace(/\D/g, "").slice(0, 8))
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" && canCheck) {
                  event.preventDefault();
                  onCheck();
                }
              }}
              disabled={disabled || loading}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              placeholder="Утасны 8 орон"
              className="h-10 min-w-0 flex-1 rounded-lg border border-white/15 bg-[#122131] px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-300 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={onCheck}
              disabled={!canCheck}
              className="flex h-10 min-w-20 items-center justify-center gap-2 rounded-lg bg-emerald-300 px-3 text-xs font-bold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-100"
            >
              {loading ? (
                <>
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                  Шалгаж байна
                </>
              ) : (
                "Шалгах"
              )}
            </button>
          </div>
        </div>
      )}
      <p className="mt-3 text-[11px] leading-4 text-slate-400">
        Хөнгөлөлтийн хувийг сагсны хоол бүр дээр сонгоно.
      </p>
      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-xs text-rose-300">
          {error}
        </p>
      ) : null}
    </section>
  );
}
