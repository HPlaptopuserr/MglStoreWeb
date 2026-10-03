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

  const [outstandingPayments, setOutstandingPayments] =
    useState<OutstandingPaymentSummary | null>(null);

  const [filteredRequests, setFilteredRequests] = useState<StockRequest[]>([]);

  const [user, setUser] = useState<StockRequestUser | null>(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("vendor_user") || "{}");
    if (storedUser.id && storedUser.organizationId) {
      setUser(storedUser);
    }
  }, []);

  const refreshStockRequests = useCallback(async () => {
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
    outstandingPayments,
    filteredRequests,
    setFilteredRequests,
    user,
    refreshStockRequests,
    handleCancel,
  };
}
