"use client";

import { useEffect, useRef, useState } from "react";
import { API, adminFetch, getApiErrorMessage } from "@/lib/api";

import {
  parseEnrichmentBatch,
  type EnrichmentProgress,
} from "./enrichment-response";
export type { EnrichmentProgress } from "./enrichment-response";

const initial: EnrichmentProgress = {
  total: 0,
  processed: 0,
  created: 0,
  existing: 0,
  skipped: 0,
  warehouseProducts: 0,
  issues: [],
};

export function useCatalogEnrichment(onUpdated: () => Promise<void>) {
  const [progress, setProgress] = useState<EnrichmentProgress | null>(null);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");
  const active = useRef<AbortController | null>(null);
  const updatedCallback = useRef(onUpdated);
  useEffect(() => {
    updatedCallback.current = onUpdated;
  }, [onUpdated]);
  useEffect(() => () => active.current?.abort(), []);

  const start = async () => {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setRunning(true);
    setCompleted(false);
    setError("");
    setProgress(initial);
    let totals = { ...initial };
    try {
      let cursor: string | undefined;
      let startedAt: string | undefined;
      do {
        const batchController = new AbortController();
        const cancel = () => batchController.abort();
        controller.signal.addEventListener("abort", cancel, { once: true });
        const timeout = window.setTimeout(cancel, 35_000);
        let batch: ReturnType<typeof parseEnrichmentBatch>;
        try {
          const response = await adminFetch(
            `${API}/products/master-catalog/admin/enrich`,
            {
              method: "POST",
              signal: batchController.signal,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ cursor, startedAt }),
            },
          );
          if (!response.ok)
            throw new Error(
              await getApiErrorMessage(response, "Сан шинэчилж чадсангүй"),
            );
          batch = parseEnrichmentBatch(
            await response.json(),
            cursor,
            startedAt,
          );
        } catch (cause: unknown) {
          if (batchController.signal.aborted && !controller.signal.aborted)
            throw new Error(
              "Тулгалтын хүсэлт удаж байна. Дууссан хэсгүүд хадгалагдсан; дахин тулгана уу.",
            );
          throw cause;
        } finally {
          window.clearTimeout(timeout);
          controller.signal.removeEventListener("abort", cancel);
        }
        if (controller.signal.aborted) return;
        totals = {
          total: batch.total,
          processed: totals.processed + batch.processed,
          created: totals.created + batch.created,
          existing: totals.existing + batch.existing,
          skipped: totals.skipped + batch.skipped,
          warehouseProducts: totals.warehouseProducts + batch.warehouseProducts,
          issues: [...totals.issues, ...batch.issues].slice(0, 100),
        };
        setProgress(totals);
        cursor = batch.nextCursor ?? undefined;
        startedAt = batch.startedAt;
      } while (cursor);
      setCompleted(true);
    } catch (cause: unknown) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error ? cause.message : "Сан шинэчилж чадсангүй",
        );
    } finally {
      if (!controller.signal.aborted) {
        setRunning(false);
        try {
          await updatedCallback.current();
        } catch {
          setError(
            "Сангийн жагсаалтыг дахин ачаалж чадсангүй. Хуудсыг шинэчилнэ үү.",
          );
        }
      }
      active.current = null;
    }
  };
  return { progress, running, completed, error, start };
}
