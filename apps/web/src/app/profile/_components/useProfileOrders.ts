"use client";

import { useCallback, useEffect, useState } from "react";
import { API } from "@/lib/api";
import type { AuthUser } from "@/lib/auth-context";
import type { ProfileOrder } from "./types";

type AuthFetch = (url: string, init?: RequestInit) => Promise<Response>;

export function useProfileOrders(user: AuthUser | null, authFetch: AuthFetch) {
  const [orders, setOrders] = useState<ProfileOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const res = await authFetch(`${API}/store/orders`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || "Захиалгууд ачаалахад алдаа гарлаа");
        return;
      }
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch {
      setError("Сүлжээний алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }, [authFetch, user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    error,
    loading,
    orders,
    refresh: fetchOrders,
  };
}
