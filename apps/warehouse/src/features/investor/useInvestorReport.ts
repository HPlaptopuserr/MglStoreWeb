"use client";
import { useEffect, useState } from "react";
import type { WarehouseInvestorReport } from "@mgl/types";
import { API, wmsFetch } from "@/lib/api";
import { INVESTMENT_UPDATED_EVENT } from "./useInvestmentSummary";

export function useInvestorReport(
  warehouseId: string,
  filters: { from: string; to: string; productPage: number; salesPage: number },
  refreshKey: number,
) {
  const [data, setData] = useState<WarehouseInvestorReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentRefreshKey, setPaymentRefreshKey] = useState(0);
  useEffect(() => {
    const refresh = () => setPaymentRefreshKey((key) => key + 1);
    window.addEventListener(INVESTMENT_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(INVESTMENT_UPDATED_EVENT, refresh);
  }, []);
  const { from, to, productPage, salesPage } = filters;
  useEffect(() => {
    if (!warehouseId) {
      setData(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    const params = new URLSearchParams({
      productPage: String(productPage),
      salesPage: String(salesPage),
    });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    void (async () => {
      try {
        const response = await wmsFetch(
          `${API}/warehouse-viewer/warehouses/${encodeURIComponent(warehouseId)}/report?${params}`,
          { signal: controller.signal },
        );
        const payload: unknown = await response.json();
        if (!response.ok)
          throw new Error(
            payload && typeof payload === "object" && "message" in payload
              ? String(payload.message)
              : "Тайланг ачаалж чадсангүй.",
          );
        if (!controller.signal.aborted)
          setData(payload as WarehouseInvestorReport);
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
    })();
    return () => controller.abort();
  }, [
    warehouseId,
    from,
    to,
    productPage,
    salesPage,
    refreshKey,
    paymentRefreshKey,
  ]);
  return { data, loading, error };
}
