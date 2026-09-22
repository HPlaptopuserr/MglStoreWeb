"use client";

import { FileSpreadsheet } from "lucide-react";
import { Button } from "@mgl/ui";
import type { InventoryFilters } from "./inventory.types";
import { useInventoryExport } from "./useInventoryExport";

interface InventoryExportButtonProps extends InventoryFilters {
  warehouseName: string;
  disabled?: boolean;
}

function InventoryExportAction({
  disabled,
  ...options
}: InventoryExportButtonProps) {
  const { exportInventory, isExporting, error, exportedCount } =
    useInventoryExport(options);

  return (
    <div className="flex max-w-full flex-col items-start gap-1.5 sm:items-end">
      <Button
        type="button"
        variant="white"
        size="sm"
        onClick={exportInventory}
        disabled={disabled || !options.warehouseId}
        isLoading={isExporting}
        loadingText="Excel бэлтгэж байна…"
        aria-busy={isExporting}
        title="Сонгосон агуулахын хайлт, шүүлтүүрт тохирох бүх барааг татах"
        icon={
          <FileSpreadsheet
            className="h-4 w-4 text-emerald-600"
            aria-hidden="true"
          />
        }
        className="border border-slate-200 text-xs text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 focus-visible:ring-emerald-500"
      >
        Excel татах
      </Button>
      {error && (
        <p role="alert" className="max-w-sm text-xs text-red-600">
          {error}
        </p>
      )}
      <span role="status" className="sr-only">
        {isExporting
          ? "Нөөцийн мэдээллээр Excel файл бэлтгэж байна."
          : exportedCount !== null
            ? `${exportedCount} барааны Excel файл бэлэн боллоо.`
            : ""}
      </span>
    </div>
  );
}

export function InventoryExportButton(props: InventoryExportButtonProps) {
  // A scope change cancels the old request and clears its feedback.
  return (
    <InventoryExportAction
      key={JSON.stringify([props.warehouseId, props.search, props.status])}
      {...props}
    />
  );
}
