"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { WarehouseInvestmentSummary } from "@mgl/types";
import { API, wmsFetch } from "@/lib/api";

export const INVESTMENT_UPDATED_EVENT = "warehouse-investment-updated";

export function useInvestmentSummary(warehouseId: string) {
  const [loaded, setLoaded] = useState<{
    warehouseId: string;
    summary: WarehouseInvestmentSummary;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const active = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    active.current?.abort();
    if (!warehouseId) return;
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setError("");
    try {
      const response = await wmsFetch(
        `${API}/warehouse-viewer/warehouses/${encodeURIComponent(warehouseId)}/investment`,
        { signal: controller.signal },
      );
      const payload: unknown = await response.json();
      if (!response.ok)
        throw new Error(
          payload && typeof payload === "object" && "message" in payload
            ? String(payload.message)
            : "Хөрөнгө оруулалтын дүнг ачаалж чадсангүй.",
        );
      if (!controller.signal.aborted)
        setLoaded({
          warehouseId,
          summary: payload as WarehouseInvestmentSummary,
        });
    } catch (reason) {
      if (!controller.signal.aborted)
        setError(
          reason instanceof Error
            ? reason.message
            : "Сервертэй холбогдож чадсангүй.",
        );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [warehouseId]);
  useEffect(() => {
    void refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener(INVESTMENT_UPDATED_EVENT, refresh);
    return () => {
      active.current?.abort();
      window.removeEventListener("focus", refresh);
      window.removeEventListener(INVESTMENT_UPDATED_EVENT, refresh);
    };
  }, [refresh]);
  return {
    summary: loaded?.warehouseId === warehouseId ? loaded.summary : null,
    loading,
    error,
    refresh,
  };
}
