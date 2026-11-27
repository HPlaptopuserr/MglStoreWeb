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
  compact = false,
  onSave,
}: {
  member: WarehouseViewerMember;
  busy: boolean;
  compact?: boolean;
  onSave: (userId: string, amount: string, version: number) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div
      className={
        compact
          ? "rounded-lg bg-slate-50 p-3 xl:bg-transparent xl:p-0"
          : "mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4"
      }
    >
      <div
        className={
          compact
            ? "flex flex-col items-start gap-3"
            : "flex flex-wrap items-center justify-between gap-3"
        }
      >
        <div>
          <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Wallet className="size-4 text-blue-600" />
            Нийт оруулсан хөрөнгө
          </p>
          <p className="mt-2 break-words text-xl font-semibold tabular-nums text-slate-950">
            {formatWarehouseInvestment(member.investmentAmount)}
          </p>
          {compact && (
            <p className="mt-1 text-xs text-slate-500">
              Хуримтлагдсан нийт дүн
            </p>
          )}
        </div>
        <button
          type="button"
          aria-expanded={editing}
          disabled={busy}
          onClick={() => {
            setEditing(!editing);
          }}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
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
