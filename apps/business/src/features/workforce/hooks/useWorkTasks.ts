"use client";
import { useEffect, useState, useCallback } from "react";
import type { WorkTaskReport } from "../model/work-tasks";
export function useWorkTasks(
  organizationId: string,
  from: string,
  to: string,
  refreshSignal: object | null,
) {
  const [items, setItems] = useState<WorkTaskReport[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((v) => v + 1), []);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError("");
    setItems([]);
    void (async () => {
      try {
        const r = await fetch(
          `/api/workforce/work-tasks?${new URLSearchParams({ organizationId, from, to })}`,
          { signal: abort.signal, cache: "no-store" },
        );
        const result = (await r.json()) as {
          items?: WorkTaskReport[];
          message?: string;
        };
        if (!r.ok) throw Error(result.message ?? "Тайлан ачаалсангүй");
        if (!abort.signal.aborted) setItems(result.items ?? []);
      } catch (e) {
        if (!abort.signal.aborted)
          setError(e instanceof Error ? e.message : "Холболтын алдаа");
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    })();
    return () => abort.abort();
  }, [organizationId, from, to, revision, refreshSignal]);
  return { items, loading, error, refresh };
}
