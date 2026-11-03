"use client";

import { useCallback, useEffect, useState } from "react";
import type { WarehouseInvestorBankAccount } from "@mgl/types";
import { paymentRequest } from "@/features/payments/payment-request";
import { INVESTMENT_UPDATED_EVENT } from "../useInvestmentSummary";

export function useInvestorBankAccount() {
  const [account, setAccount] = useState<WarehouseInvestorBankAccount | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => {
    setLoading(true);
    setError("");
    setAttempt((value) => value + 1);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void paymentRequest<WarehouseInvestorBankAccount | null>(
      "/warehouse-viewer/bank-account",
      { signal: controller.signal },
    )
      .then((value) => {
        if (!controller.signal.aborted) setAccount(value);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Дансны мэдээллийг ачаалж чадсангүй.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);
  useEffect(() => {
    window.addEventListener(INVESTMENT_UPDATED_EVENT, reload);
    return () => window.removeEventListener(INVESTMENT_UPDATED_EVENT, reload);
  }, [reload]);
  return { account, loading, error, reload };
}
