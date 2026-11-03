"use client";

import { InvestorBankAccountDetails } from "@mgl/ui";
import { useInvestorBankAccount } from "./useInvestorBankAccount";

export function InvestorBankAccountSection() {
  const state = useInvestorBankAccount();
  if (state.loading)
    return (
      <p
        role="status"
        className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500"
      >
        Дансны мэдээллийг ачаалж байна…
      </p>
    );
  if (state.error)
    return (
      <div
        role="alert"
        className="rounded-2xl bg-red-50 p-5 text-sm text-red-700"
      >
        <p>{state.error}</p>
        <button
          type="button"
          onClick={state.reload}
          className="mt-3 min-h-10 font-semibold underline"
        >
          Дахин ачаалах
        </button>
      </div>
    );
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
      <InvestorBankAccountDetails account={state.account} />
      <p className="mt-3 text-xs leading-6 text-slate-500">
        Ногдол ашиг авахдаа хамгийн сүүлд баталгаажуулсан данс. Дансны
        өөрчлөлтийг ногдол ашиг авах хүсэлтээр дахин баталгаажуулна.
      </p>
    </div>
  );
}
