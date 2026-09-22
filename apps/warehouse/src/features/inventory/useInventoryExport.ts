"use client";

import { useEffect, useRef, useState } from "react";
import { fetchInventoryForExport } from "./inventory.api";
import type { InventoryFilters } from "./inventory.types";

interface InventoryExportOptions extends InventoryFilters {
  warehouseName: string;
}

export function useInventoryExport(options: InventoryExportOptions) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportedCount, setExportedCount] = useState<number | null>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  const exportInventory = async () => {
    if (!options.warehouseId || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setIsExporting(true);
    setError(null);
    setExportedCount(null);

    try {
      const items = await fetchInventoryForExport(options, controller.signal);
      if (items.length === 0) {
        throw new Error(
          "Татах бараа олдсонгүй. Хайлт, шүүлтүүрээ өөрчилнө үү.",
        );
      }
      // Keep the spreadsheet library out of the initial page bundle.
      const { exportInventoryToExcel } = await import("./export-inventory");
      controller.signal.throwIfAborted();
      exportInventoryToExcel({ ...options, items });
      setExportedCount(items.length);
    } catch (exportError) {
      if (!controller.signal.aborted) {
        setError(
          exportError instanceof Error
            ? exportError.message
            : "Excel файл үүсгэхэд алдаа гарлаа. Дахин оролдоно уу.",
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsExporting(false);
        request.current = null;
      }
    }
  };

  return { exportInventory, isExporting, error, exportedCount };
}
