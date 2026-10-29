"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { paymentRequest } from "@/features/payments/payment-request";
import { INVESTMENT_UPDATED_EVENT } from "../useInvestmentSummary";

export interface InvestmentTopUp {
  id: string;
  amount: string;
  method: "QR" | "BANK_TRANSFER";
  status: "PENDING" | "PAID";
  reference: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  qrText: string | null;
  createdAt: string;
  paidAt: string | null;
  investorName: string;
}

export function useInvestmentTopUps(warehouseId: string) {
  const [items, setItems] = useState<InvestmentTopUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const inFlight = useRef(false);
  const requestId = useRef(crypto.randomUUID());
  const endpoint = `/warehouse-viewer/warehouses/${encodeURIComponent(warehouseId)}/top-ups`;
  const reload = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        const result = await paymentRequest<InvestmentTopUp[]>(endpoint, {
          signal,
        });
        if (!signal?.aborted) setItems(result);
      } catch (reason) {
        if (!signal?.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Цэнэглэлтийг ачаалж чадсангүй.",
          );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [endpoint],
  );
  useEffect(() => {
    const controller = new AbortController();
    void reload(controller.signal);
    return () => controller.abort();
  }, [reload]);
  const mutate = async (path: string, body?: object) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const item = await paymentRequest<InvestmentTopUp>(`${endpoint}${path}`, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      });
      setItems((current) => [
        item,
        ...current.filter((entry) => entry.id !== item.id),
      ]);
      if (item.status === "PAID") {
        window.dispatchEvent(new Event(INVESTMENT_UPDATED_EVENT));
        setMessage("Төлбөр баталгаажиж, хөрөнгө оруулалтын дүнд нэмэгдлээ.");
      } else if (path)
        setMessage(
          item.method === "QR"
            ? "Төлбөр хараахан баталгаажаагүй байна."
            : "Дансаар орсон төлбөрийг оператор баталгаажуулна.",
        );
      return item;
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Төлбөрийн хүсэлт амжилтгүй боллоо.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return {
    items,
    loading,
    busy,
    error,
    message,
    reload,
    create: async (amount: string, method: InvestmentTopUp["method"]) => {
      const item = await mutate("", {
        amount,
        method,
        requestId: requestId.current,
      });
      if (item) requestId.current = crypto.randomUUID();
      return item;
    },
    check: (id: string) => mutate(`/${encodeURIComponent(id)}/check`),
    confirm: (id: string) => mutate(`/${encodeURIComponent(id)}/confirm`),
  };
}
