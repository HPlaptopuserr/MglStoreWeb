"use client";
import { useCallback, useEffect, useState } from "react";
import type { WarehouseDividendVerification } from "@mgl/types";
import {
  readPendingDividend,
  storePendingDividend,
} from "./dividend-verification-storage";
import { INVESTMENT_UPDATED_EVENT } from "../useInvestmentSummary";
import {
  startDividendVerification,
  confirmDividendVerification,
  DividendVerificationError,
  type DividendChoiceDraft,
} from "./dividend-choice-service";

export function useDividendVerification(
  warehouseId: string,
  dividendId: string,
  version: number,
  onConfirmed: () => void,
) {
  const storageKey = `warehouse-dividend-verification:${warehouseId}:${dividendId}:${version}`;
  const [session, setSession] = useState<WarehouseDividendVerification | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      const pending = readPendingDividend(storageKey);
      if (!cancelled && pending) setSession(pending);
    });
    return () => {
      cancelled = true;
    };
  }, [storageKey]);
  const start = useCallback(
    async (draft: DividendChoiceDraft) => {
      if (busy) return;
      setBusy(true);
      setError("");
      try {
        const next = await startDividendVerification(
          warehouseId,
          dividendId,
          version,
          draft,
        );
        storePendingDividend(storageKey, next);
        setSession(next);
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Баталгаажуулалт эхлүүлж чадсангүй.",
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, warehouseId, dividendId, version, storageKey],
  );
  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      if (Date.parse(session.expiresAt) <= Date.now()) {
        setError("Баталгаажуулах хугацаа дууссан байна. Дахин эхлүүлнэ үү.");
        storePendingDividend(storageKey, null);
        setSession(null);
        return;
      }
      let delay = 3000;
      try {
        const response = await confirmDividendVerification(
          warehouseId,
          session.id,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        if (response.status === "CONFIRMED") {
          storePendingDividend(storageKey, null);
          setSession(null);
          window.dispatchEvent(new Event(INVESTMENT_UPDATED_EVENT));
          onConfirmed();
          return;
        }
        setError("");
      } catch (reason) {
        if (controller.signal.aborted) return;
        setError(
          reason instanceof Error ? reason.message : "Төлөв шалгаж чадсангүй.",
        );
        if (
          reason instanceof DividendVerificationError &&
          [400, 403, 404, 409, 410].includes(reason.status)
        ) {
          storePendingDividend(storageKey, null);
          setSession(null);
          return;
        }
        delay = 10000;
      }
      if (!controller.signal.aborted)
        timer = setTimeout(() => void check(), delay);
    };
    timer = setTimeout(() => void check(), 3000);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [session, warehouseId, onConfirmed, storageKey]);
  return { session, busy, error, start, reset: () => setSession(null) };
}
