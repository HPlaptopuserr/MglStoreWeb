"use client";
import type { StockRequestUser } from "@/features/shipments/types/stock-request.types";

import type {
  StockRequestPayment,
  StockRequestView,
} from "@/features/shipments/types/stock-request.types";
import { API, authFetch } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";

interface UseStockRequestPaymentsOptions {
  user: StockRequestUser | null;
  refreshStockRequests: () => Promise<void>;
  viewMode: StockRequestView;
}

export function useStockRequestPayments({
  user,
  refreshStockRequests,
  viewMode,
}: UseStockRequestPaymentsOptions) {
  const [paymentHistory, setPaymentHistory] = useState<StockRequestPayment[]>(
    [],
  );

  const [loadingPayments, setLoadingPayments] = useState(false);

  const [selectedPayment, setSelectedPayment] =
    useState<StockRequestPayment | null>(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [loadingPaymentDetail, setLoadingPaymentDetail] = useState(false);

  const [markingPaymentPaid, setMarkingPaymentPaid] = useState(false);

  const refreshPayments = useCallback(async () => {
    if (!user?.organizationId) return;
    try {
      setLoadingPayments(true);
      const res = await authFetch(
        `${API}/stock-requests/payments/organization/${user.organizationId}`,
      );
      if (res.ok) setPaymentHistory((await res.json()) || []);
    } catch (error) {
      console.error("Failed to fetch payments:", error);
    } finally {
      setLoadingPayments(false);
    }
  }, [user?.organizationId]);

  const openPaymentDetail = async (paymentId: string) => {
    setLoadingPaymentDetail(true);
    setShowPaymentModal(true);
    try {
      const res = await authFetch(
        `${API}/stock-requests/payments/${paymentId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setSelectedPayment(data);
      }
    } catch (error) {
      console.error("Failed to fetch payment details:", error);
    } finally {
      setLoadingPaymentDetail(false);
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const markPaymentPaidLocally = async () => {
    if (!selectedPayment || selectedPayment.status === "PAID") return;

    setMarkingPaymentPaid(true);
    try {
      const response = await authFetch(
        `${API}/stock-requests/payments/${selectedPayment.id}/dev-mark-paid`,
        { method: "POST" },
      );
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!response.ok) {
        throw new Error(body.message || "Төлбөр баталгаажуулахад алдаа гарлаа");
      }

      await Promise.all([
        openPaymentDetail(selectedPayment.id),
        refreshPayments(),
        refreshStockRequests(),
      ]);
    } catch (error: unknown) {
      alert(
        error instanceof Error
          ? error.message
          : "Төлбөр баталгаажуулахад алдаа гарлаа",
      );
    } finally {
      setMarkingPaymentPaid(false);
    }
  };

  useEffect(() => {
    if (viewMode === "payments" && user?.organizationId) {
      refreshPayments();
    }
  }, [viewMode, user?.organizationId, refreshPayments]);
  return {
    paymentHistory,
    loadingPayments,
    selectedPayment,
    setSelectedPayment,
    showPaymentModal,
    setShowPaymentModal,
    loadingPaymentDetail,
    markingPaymentPaid,
    refreshPayments,
    openPaymentDetail,
    handlePrintInvoice,
    markPaymentPaidLocally,
  };
}
