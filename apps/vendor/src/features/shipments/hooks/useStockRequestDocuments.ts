"use client";
import {
  DELIVERY_DOCUMENT_IMAGE_TYPES,
  DELIVERY_DOCUMENT_MAX_BYTES,
} from "@/features/shipments/stock-request.constants";
import type { StockRequest } from "@/features/shipments/types/stock-request.types";
import { API, authFetch } from "@/lib/api";
import type * as React from "react";
import { useRef, useState } from "react";

interface UseStockRequestDocumentsOptions {
  setRequests: React.Dispatch<React.SetStateAction<StockRequest[]>>;
  setFilteredRequests: React.Dispatch<React.SetStateAction<StockRequest[]>>;
}

export function useStockRequestDocuments({
  setRequests,
  setFilteredRequests,
}: UseStockRequestDocumentsOptions) {
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [selectedRequest, setSelectedRequest] = useState<StockRequest | null>(
    null,
  );

  const [savingDeliveryDocument, setSavingDeliveryDocument] = useState(false);

  const documentFileInputRef = useRef<HTMLInputElement>(null);

  const updateRequestDispatch = (
    dispatch: NonNullable<StockRequest["dispatch"]>,
  ) => {
    if (!selectedRequest) return;

    const updateRequest = (request: StockRequest): StockRequest =>
      request.id === selectedRequest.id
        ? {
            ...request,
            dispatch: request.dispatch
              ? {
                  ...request.dispatch,
                  ...dispatch,
                }
              : dispatch,
          }
        : request;

    setRequests((current) => current.map(updateRequest));
    setFilteredRequests((current) => current.map(updateRequest));
    setSelectedRequest((current) =>
      current
        ? {
            ...current,
            dispatch: current.dispatch
              ? {
                  ...current.dispatch,
                  ...dispatch,
                }
              : dispatch,
          }
        : current,
    );
  };

  const saveDeliveryDocumentUrl = async (
    padaanUrl: string,
    successMessage: string,
  ) => {
    if (!selectedRequest) return;
    setSavingDeliveryDocument(true);
    try {
      const response = await authFetch(
        `${API}/stock-requests/${selectedRequest.id}/padaan`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ padaanUrl }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "Падаан хадгалахад алдаа гарлаа");
      }

      updateRequestDispatch(payload);
      alert(successMessage);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Падаан хадгалахад алдаа гарлаа",
      );
    } finally {
      setSavingDeliveryDocument(false);
    }
  };

  const uploadDeliveryDocument = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !selectedRequest) return;

    if (!DELIVERY_DOCUMENT_IMAGE_TYPES.has(file.type)) {
      alert("Зөвхөн JPG, PNG, WebP, GIF зураг сонгоно уу");
      event.target.value = "";
      return;
    }

    if (file.size > DELIVERY_DOCUMENT_MAX_BYTES) {
      alert("Падааны зураг 10MB-аас ихгүй байх шаардлагатай");
      event.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    setSavingDeliveryDocument(true);
    try {
      const response = await authFetch(
        `${API}/stock-requests/${selectedRequest.id}/padaan/upload`,
        {
          method: "POST",
          body: formData,
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload?.message || "Падааны зураг upload хийхэд алдаа гарлаа",
        );
      }

      updateRequestDispatch(payload);
      alert("Падааны зураг хадгалагдлаа");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Падааны зураг upload хийхэд алдаа гарлаа",
      );
    } finally {
      setSavingDeliveryDocument(false);
      event.target.value = "";
    }
  };

  const removeDeliveryDocument = async () => {
    if (!selectedRequest?.dispatch?.padaanUrl) return;
    if (!confirm("Падааны зургийг устгах уу?")) return;
    await saveDeliveryDocumentUrl("", "Падааны зураг устгагдлаа");
  };
  return {
    showDetailModal,
    setShowDetailModal,
    selectedRequest,
    setSelectedRequest,
    savingDeliveryDocument,
    documentFileInputRef,
    uploadDeliveryDocument,
    removeDeliveryDocument,
  };
}
