"use client";

import { useCallback, useEffect, useState } from "react";
import type { DeliveryPackageDetails } from "@mgl/ui";
import { advanceOnlineOrder, fetchOnlineOrders } from "./online-order.api";
import type {
  OnlineOrder,
  OnlineOrderStatus,
} from "./online-order.types";
import { WAREHOUSE_ONLINE_ORDER_EVENT } from "../notifications/warehouse-notification.types";

export function useOnlineOrders(
  status: OnlineOrderStatus | "",
  search: string,
  warehouseId: string,
) {
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [attentionCount, setAttentionCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      if (!warehouseId) {
        setOrders([]);
        return;
      }
      const [data, attention] = await Promise.all([
        fetchOnlineOrders({ status, search, warehouseId }),
        fetchOnlineOrders({ status: "CONFIRMED", warehouseId, limit: 1 }),
      ]);
      setOrders(data.orders);
      setAttentionCount(attention.total);
    } catch (requestError) {
      setAttentionCount(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Сүлжээний алдаа гарлаа",
      );
    } finally {
      setLoading(false);
    }
  }, [search, status, warehouseId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void refresh(), 250);
    const interval = window.setInterval(() => void refresh(true), 15_000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [refresh]);

  useEffect(() => {
    const handleNewOrder = () => void refresh(true);
    window.addEventListener(WAREHOUSE_ONLINE_ORDER_EVENT, handleNewOrder);
    return () =>
      window.removeEventListener(WAREHOUSE_ONLINE_ORDER_EVENT, handleNewOrder);
  }, [refresh]);

  const advance = useCallback(
    async (orderId: string, details?: DeliveryPackageDetails) => {
      setActionOrderId(orderId);
      setError("");
      try {
        await advanceOnlineOrder(orderId, details);
        await refresh();
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Сүлжээний алдаа гарлаа",
        );
        throw requestError;
      } finally {
        setActionOrderId(null);
      }
    },
    [refresh],
  );

  return { orders, loading, actionOrderId, error, refresh, advance, attentionCount };
}
