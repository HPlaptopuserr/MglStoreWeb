import { useEffect, useMemo, useState } from "react";
import type { PosReceipt } from "@mgl/types";
import { posRequest } from "../api/_pos-client";
import {
  cashierKey,
  filterSalesHistory,
  salesDay,
} from "../utils/sales-history-filters";

export function useSalesHistory(
  branchId?: string,
  selectedRange?: { start: string; end: string },
  demoOverride?: boolean,
) {
  const [range, setRange] = useState(() => {
    const today = salesDay(new Date().toISOString());
    return { start: today, end: today };
  });
  const [cashier, setCashier] = useState("");
  const [localDemo, setDemo] = useState(false);
  const demo = demoOverride ?? localDemo;
  const demoDay = demo ? selectedRange?.end : undefined;
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<PosReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData([]);
    async function load() {
      try {
        let rows: PosReceipt[];
        if (demo && process.env.NODE_ENV !== "production") {
          const { createSalesHistoryDemo } =
            await import("../utils/sales-history-demo");
          rows = createSalesHistoryDemo(
            demoDay ? new Date(`${demoDay}T12:00:00+08:00`) : new Date(),
          );
        } else {
          if (!branchId)
            throw new Error("Салбарын мэдээлэл олдсонгүй. Кассаа сонгоно уу.");
          const query = new URLSearchParams({
            branchId,
            includeVoided: "true",
          });
          rows = await posRequest<PosReceipt[]>(`/pos/receipts?${query}`, {
            signal: controller.signal,
          });
        }
        if (!controller.signal.aborted) setData(rows);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Түүх ачаалж чадсангүй.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [branchId, demo, demoDay, revision]);
  const employees = useMemo(
    () =>
      [
        ...new Map(
          data.map((receipt) => [cashierKey(receipt), receipt.cashierName]),
        ).entries(),
      ].map(([id, name]) => ({ id, name })),
    [data],
  );
  const start = selectedRange?.start ?? range.start;
  const end = selectedRange?.end ?? range.end;
  const receipts = useMemo(
    () => filterSalesHistory(data, start, cashier, end),
    [data, start, end, cashier],
  );
  return {
    range,
    setRange,
    cashier,
    setCashier,
    demo,
    setDemo: (value: boolean) => {
      setCashier("");
      setDemo(value);
    },
    employees,
    receipts,
    loading,
    error,
    refresh: () => setRevision((value) => value + 1),
  };
}
