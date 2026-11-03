"use client";

import { useState } from "react";
import { Banknote, ChevronRight } from "lucide-react";
import { type WarehouseMonthlyDividend } from "@mgl/types";
import { MonthlyDividendDialog } from "./MonthlyDividendDialog";

interface DividendChoiceDialogProps {
  dividend: WarehouseMonthlyDividend & { id: string; version: number };
  warehouseId: string;
  onConfirmed: () => void;
}

export function DividendChoiceDialog({
  dividend,
  warehouseId,
  onConfirmed,
}: DividendChoiceDialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-900 sm:w-auto"
      >
        <Banknote className="size-4" aria-hidden="true" />
        Ногдол ашиг авах
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
      {open && (
        <MonthlyDividendDialog
          dividend={dividend}
          warehouseId={warehouseId}
          onClose={() => setOpen(false)}
          onConfirmed={onConfirmed}
        />
      )}
    </>
  );
}
