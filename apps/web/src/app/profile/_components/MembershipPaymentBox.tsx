"use client";

import { CreditCard } from "lucide-react";

type Props = {
  amount: number;
  fullName: string;
  phone: string;
  paymentReference: string;
  onPaymentReferenceChange: (value: string) => void;
};

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15";

export function MembershipPaymentBox({
  amount,
  fullName,
  phone,
  paymentReference,
  onPaymentReferenceChange,
}: Props) {
  if (amount <= 0) return null;

  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-3">
      <div className="mb-2 flex items-center gap-2">
        <CreditCard size={16} className="text-orange-600" />
        <p className="text-sm font-black text-slate-950">
          {amount.toLocaleString()}₮ төлнө
        </p>
      </div>
      <p className="rounded-xl border border-orange-100 bg-white px-3 py-2 text-xs font-semibold leading-relaxed text-orange-800">
        QuickQR үүсгээд банкны апп-аар шууд төлнө.
      </p>
      <label className="mt-2 block">
        <span className="mb-1.5 block text-xs font-black text-slate-500">
          Гүйлгээний утга / reference
        </span>
        <input
          value={paymentReference}
          onChange={(event) => onPaymentReferenceChange(event.target.value)}
          placeholder={[fullName, phone].filter(Boolean).join(" · ")}
          className={inputCls}
        />
      </label>
    </div>
  );
}
