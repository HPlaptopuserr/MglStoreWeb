"use client";
import type { StockRequestUser } from "@/features/shipments/types/stock-request.types";

import type {
  StockRequestCartItem,
  StockRequestView,
  SupplyWarehouse,
} from "@/features/shipments/types/stock-request.types";
import { API, authFetch } from "@/lib/api";
import type * as React from "react";
import { useState } from "react";

interface UseStockRequestSubmissionOptions {
  selectedWarehouse: SupplyWarehouse | null;
  cart: StockRequestCartItem[];
  deliveryAddress: string;
  user: StockRequestUser | null;
  deliveryPhone: string;
  note: string;
  refreshStockRequests: () => Promise<void>;
  setViewMode: React.Dispatch<React.SetStateAction<StockRequestView>>;
  clearCart: () => void;
  exitWarehouse: () => void;
}

export function useStockRequestSubmission({
  selectedWarehouse,
  cart,
  deliveryAddress,
  user,
  deliveryPhone,
  note,
  refreshStockRequests,
  setViewMode,
  clearCart,
  exitWarehouse,
}: UseStockRequestSubmissionOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [showOrderSuccessModal, setShowOrderSuccessModal] = useState(false);

  const handleSubmit = async () => {
    if (!selectedWarehouse || cart.length === 0) {
      alert("Бараа сонгоно уу");
      return;
    }
    if (!deliveryAddress.trim()) {
      alert("Хүргүүлэх байршлаа сонгох эсвэл хаягаа оруулна уу");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await authFetch(`${API}/stock-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: user?.organizationId,
          warehouseId: selectedWarehouse.id,
          requestedById: user?.id,
          deliveryAddress: deliveryAddress.trim(),
          deliveryPhone: deliveryPhone.trim() || null,
          note: note.trim() || null,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      });
      if (!response.ok) {
        const responseBody = (await response.json()) as {
          code?: string;
          message?: string;
        };
        if (responseBody.code === "OUTSTANDING_STOCK_PAYMENT") {
          await refreshStockRequests();
          setShowConfirmModal(false);
          setViewMode("payments");
          return;
        }
        throw new Error(responseBody.message || "Failed");
      }
      setShowOrderSuccessModal(true);
    } catch (error: unknown) {
      alert(
        error instanceof Error
          ? error.message
          : "Захиалга илгээхэд алдаа гарлаа",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const finishSuccessfulOrder = () => {
    setShowOrderSuccessModal(false);
    clearCart();
    exitWarehouse();
    void refreshStockRequests();
    setViewMode("requests");
  };
  return {
    isSubmitting,
    showConfirmModal,
    setShowConfirmModal,
    showOrderSuccessModal,
    handleSubmit,
    finishSuccessfulOrder,
  };
}
