"use client";
import { RecordedAmountForm } from "./RecordedAmountForm";
import { useState } from "react";
import { Wallet, CirclePlus } from "lucide-react";
import {
  formatWarehouseInvestment,
  type WarehouseViewerMember,
} from "@mgl/types";

export function InvestmentAmountEditor({
  member,
  busy,
  onSave,
}: {
  member: WarehouseViewerMember;
  busy: boolean;
  onSave: (userId: string, amount: string, version: number) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Wallet className="size-4 text-blue-600" />
            Нийт оруулсан хөрөнгө
          </p>
          <p className="mt-2 text-lg font-bold text-slate-950">
            {formatWarehouseInvestment(member.investmentAmount)}
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setEditing(!editing);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
        >
          <CirclePlus className="size-3.5" />
          {editing ? "Болих" : "Цэнэглэх"}
        </button>
      </div>
      {editing && (
        <RecordedAmountForm
          label={`${member.fullName} — нэмэх дүн (₮)`}
          description="Оруулсан дүн одоогийн хөрөнгө оруулалт дээр нэмэгдэнэ."
          submitLabel="Цэнэглэх"
          icon={CirclePlus}
          busy={busy}
          onSubmit={(amount) =>
            onSave(member.userId, amount, member.investmentVersion)
          }
          onSaved={() => setEditing(false)}
        />
      )}
    </div>
  );
}
