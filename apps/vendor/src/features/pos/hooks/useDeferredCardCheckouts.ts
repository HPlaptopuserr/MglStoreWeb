"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DeferredCardCheckout } from "@mgl/types";
import { getDeferredCardCheckouts } from "../api/card-payment-recovery";

export function useDeferredCardCheckouts(registerId?: string) {
  const [checkouts, setCheckouts] = useState<DeferredCardCheckout[]>([]);
  const [version, setVersion] = useState(0);
  const scope = useRef(registerId);
  const remember = useCallback((record: DeferredCardCheckout) => setCheckouts(previous =>
    [...previous.filter(item => item.attemptId !== record.attemptId), record]), []);
  const refresh = useCallback(() => setVersion(value => value + 1), []);
  useEffect(() => {
    if (scope.current !== registerId) { scope.current = registerId; setCheckouts([]); }
    if (!registerId) return;
    let disposed = false;
    let loading = false;
    const load = async () => {
      if (loading) return;
      loading = true;
      try {
        const data = await getDeferredCardCheckouts(registerId);
        if (!disposed) setCheckouts(data.checkouts.filter(item => item.kind === "RETAIL"));
      } catch { /* Keep already loaded recovery evidence during an API outage. */ }
      finally { loading = false; }
    };
    void load();
    const timer = window.setInterval(load, 15_000);
    window.addEventListener("online", load);
    return () => { disposed = true; window.clearInterval(timer); window.removeEventListener("online", load); };
  }, [registerId, version]);
  return { checkouts, refresh, remember };
}
