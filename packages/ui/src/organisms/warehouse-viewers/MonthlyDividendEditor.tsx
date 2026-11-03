"use client";

import { useState } from "react";
import { Banknote, Pencil, Save } from "lucide-react";
import {
  formatWarehouseInvestment,
  type WarehouseViewerMember,
} from "@mgl/types";
import { RecordedAmountForm } from "./RecordedAmountForm";

interface MonthlyDividendEditorProps {
  member: WarehouseViewerMember;
  busy: boolean;
  defaultOpen?: boolean;
  onSave: (
    userId: string,
    amount: string,
    version: number,
    month: string,
  ) => Promise<boolean>;
}

export function MonthlyDividendEditor({
  member,
  busy,
  onSave,
  defaultOpen = false,
}: MonthlyDividendEditorProps) {
  const [editing, setEditing] = useState(defaultOpen);
  const dividend = member.monthlyDividend;
  if (!dividend) return null;
  return (
    <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium text-emerald-800">
            <Banknote className="size-4" />
            Энэ сарын ногдол ашиг
          </p>
          <p className="mt-2 text-lg font-bold text-slate-950">
            {dividend.updatedAt
              ? formatWarehouseInvestment(dividend.amount)
              : "Бүртгэгдээгүй"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {dividend.month} ·{" "}
            {dividend.updatedAt ? "Бүртгэлтэй" : "Дүн оруулаагүй"}
          </p>
        </div>
        <button
          type="button"
          disabled={busy || Boolean(dividend.decision)}
          onClick={() => setEditing(!editing)}
          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50"
        >
          <Pencil className="size-3.5" />
          {editing ? "Болих" : "Дүн оруулах"}
        </button>
      </div>
      {dividend.decision && (
        <div className="mt-3 rounded-lg bg-white p-3 text-xs leading-6 text-emerald-900">
          <p className="font-semibold">
            {dividend.decision.choice === "REINVEST"
              ? "Дахин хөрөнгө оруулсан · Үндсэн хөрөнгөд нэмэгдсэн"
              : "Дансаар авах хүсэлт · Баталгаажсан"}
          </p>
          <p>
            Verify.mn ·{" "}
            {new Date(dividend.decision.confirmedAt).toLocaleString("mn-MN", {
              timeZone: "Asia/Ulaanbaatar",
            })}
          </p>
          {dividend.decision.choice === "BANK_TRANSFER" && (
            <p className="mt-1 break-all">
              {dividend.decision.bankName} · {dividend.decision.bankAccount}
              <br />
              {dividend.decision.bankAccountName}
            </p>
          )}
        </div>
      )}
      {editing && !dividend.decision && (
        <RecordedAmountForm
          label={`${member.fullName} — ${dividend.month} сарын ногдол ашиг (₮)`}
          description="Энэ сарын ногдол ашгийн нийт дүнг оруулна. Өмнө бүртгэсэн сарын дүнг шинэчилнэ."
          initialValue={dividend.updatedAt ? dividend.amount : ""}
          submitLabel="Ногдол ашиг хадгалах"
          icon={Save}
          busy={busy}
          onSubmit={(amount) =>
            onSave(member.userId, amount, dividend.version, dividend.month)
          }
          onSaved={() => setEditing(false)}
        />
      )}
    </div>
  );
}
