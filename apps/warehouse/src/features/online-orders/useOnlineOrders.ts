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
) {
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchOnlineOrders({ status, search });
      setOrders(data.orders);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Сүлжээний алдаа гарлаа",
      );
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void refresh(), 250);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  useEffect(() => {
    const handleNewOrder = () => void refresh();
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

  return { orders, loading, actionOrderId, error, refresh, advance };
}
