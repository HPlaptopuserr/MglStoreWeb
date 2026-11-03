"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { WarehouseDispatchHistory } from "@mgl/types";
import { getDispatchHistory } from "./dispatch-api";

export function useDispatchHistory(
  warehouseId: string,
  page: number,
  search: string,
  refreshKey: number,
) {
  const [data, setData] = useState<WarehouseDispatchHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const active = useRef<AbortController | null>(null);
  const reload = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setError("");
    try {
      const result = await getDispatchHistory(
        warehouseId,
        page,
        search,
        controller.signal,
      );
      if (!controller.signal.aborted) setData(result);
    } catch (reason) {
      if (!controller.signal.aborted)
        setError(
          reason instanceof Error
            ? reason.message
            : "Паданы түүхийг ачаалж чадсангүй.",
        );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [warehouseId, page, search]);
  useEffect(() => {
    void reload();
    return () => active.current?.abort();
  }, [reload, refreshKey]);
  return { data, loading, error, reload };
}
