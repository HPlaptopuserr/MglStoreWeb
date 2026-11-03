"use client";
import type {
  OutstandingPaymentSummary,
  StockRequest,
  StockRequestUser,
  SupplyWarehouse,
} from "@/features/shipments/types/stock-request.types";
import { API, authFetch } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";

export function useStockRequestData() {
  const [requests, setRequests] = useState<StockRequest[]>([]);

  const [warehouses, setWarehouses] = useState<SupplyWarehouse[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [outstandingPayments, setOutstandingPayments] =
    useState<OutstandingPaymentSummary | null>(null);

  const [filteredRequests, setFilteredRequests] = useState<StockRequest[]>([]);

  const [user, setUser] = useState<StockRequestUser | null>(null);

  useEffect(() => {
    try {
      const storedUser: unknown = JSON.parse(
        localStorage.getItem("vendor_user") || "null",
      );
      if (
        typeof storedUser === "object" &&
        storedUser !== null &&
        "id" in storedUser &&
        typeof storedUser.id === "string" &&
        "organizationId" in storedUser &&
        typeof storedUser.organizationId === "string"
      ) {
        setUser({
          id: storedUser.id,
          organizationId: storedUser.organizationId,
        });
      } else {
        setError("Байгууллагын мэдээлэл олдсонгүй. Дахин нэвтэрнэ үү.");
        setLoading(false);
      }
    } catch {
      setError("Нэвтрэлтийн мэдээлэл буруу байна. Дахин нэвтэрнэ үү.");
      setLoading(false);
    }
  }, []);

  const refreshStockRequests = useCallback(async () => {
    if (!user?.organizationId) return;
    setError(null);
    try {
      setLoading(true);
      const [requestsRes, warehousesRes, outstandingRes] = await Promise.all([
        authFetch(
          `${API}/stock-requests?organizationId=${user?.organizationId}`,
        ),
        authFetch(
          `${API}/warehouses/organization/${user?.organizationId}/order-sources`,
        ),
        authFetch(
          `${API}/stock-requests/payments/unpaid/${user?.organizationId}`,
        ),
      ]);
      if (!requestsRes.ok || !warehousesRes.ok || !outstandingRes.ok) {
        throw new Error(
          "Бараа таталтын мэдээлэл ачаалахад алдаа гарлаа. Дахин оролдоно уу.",
        );
      }
      if (requestsRes.ok) {
        const reqs = (await requestsRes.json()) || [];
        setRequests(reqs);
        setFilteredRequests(reqs);
      }
      if (warehousesRes.ok) setWarehouses((await warehousesRes.json()) || []);
      if (outstandingRes.ok) {
        setOutstandingPayments(await outstandingRes.json());
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Мэдээлэл ачаалах боломжгүй байна",
      );
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId]);

  useEffect(() => {
    if (user?.organizationId) void refreshStockRequests();
  }, [user?.organizationId, refreshStockRequests]);

  const handleCancel = async (requestId: string) => {
    if (!confirm("Захиалгыг цуцлах уу?")) return;
    try {
      const response = await authFetch(
        `${API}/stock-requests/${requestId}/cancel`,
        { method: "PATCH" },
      );
      if (!response.ok) throw new Error("Failed");
      refreshStockRequests();
    } catch {
      alert("Захиалга цуцлахад алдаа гарлаа");
    }
  };
  return {
    requests,
    setRequests,
    warehouses,
    loading,
    error,
    outstandingPayments,
    filteredRequests,
    setFilteredRequests,
    user,
    refreshStockRequests,
    handleCancel,
  };
}
