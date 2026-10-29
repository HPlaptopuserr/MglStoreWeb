"use client";
import { useEffect } from "react";
import type { CheckoutPaymentEntry } from "../components/PosCheckoutView";
import { pollCardPayment } from "../utils/poll-card-payment";
import { useEventCallback } from "./useEventCallback";

export function usePendingCardPayments(
  entries: CheckoutPaymentEntry[],
  enabled: boolean,
  check: (id: string, signal?: AbortSignal) => Promise<boolean>,
) {
  const pendingIds = JSON.stringify(entries
    .filter(entry => entry.method === "CARD" && entry.status === "pending" && entry.attemptId)
    .map(entry => entry.id).sort());
  const checkLatest = useEventCallback(check);
  useEffect(() => {
    if (!enabled) return;
    const ids: string[] = JSON.parse(pendingIds);
    if (!ids.length) return;
    const controller = new AbortController();
    const watchers = ids.map(id => pollCardPayment(() => checkLatest(id, controller.signal)));
    const resume = () => {
      if (document.visibilityState === "visible") watchers.forEach(watcher => watcher.refresh());
    };
    window.addEventListener("focus", resume);
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      controller.abort();
      watchers.forEach(watcher => watcher.stop());
      window.removeEventListener("focus", resume);
      window.removeEventListener("online", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [pendingIds, enabled, checkLatest]);
}
