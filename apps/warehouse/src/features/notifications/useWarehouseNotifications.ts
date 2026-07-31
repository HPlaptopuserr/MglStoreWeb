"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchWarehouseNotifications } from "./warehouse-notification.api";
import {
  WAREHOUSE_ONLINE_ORDER_EVENT,
  type WarehouseNotification,
} from "./warehouse-notification.types";

const READ_IDS_KEY = "wms_notification_read_ids";
const REFRESH_INTERVAL_MS = 10_000;
const MAX_READ_IDS = 200;

function getReadIds(): Set<string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(READ_IDS_KEY) || "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

export function useWarehouseNotifications() {
  const [notifications, setNotifications] = useState<WarehouseNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [latestAlert, setLatestAlert] = useState<WarehouseNotification | null>(
    null,
  );
  const knownIdsRef = useRef<Set<string> | null>(null);
  const alertTimerRef = useRef<number | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await fetchWarehouseNotifications(signal);
      const nextIds = new Set(
        result.notifications.map((notification) => notification.id),
      );
      const newestOrder = knownIdsRef.current
        ? result.notifications.find(
            (notification) =>
              notification.type === "ONLINE_ORDER" &&
              !knownIdsRef.current?.has(notification.id),
          )
        : null;
      knownIdsRef.current = nextIds;
      setNotifications(result.notifications);
      if (newestOrder) {
        setLatestAlert(newestOrder);
        window.dispatchEvent(new Event(WAREHOUSE_ONLINE_ORDER_EVENT));
        if (alertTimerRef.current) window.clearTimeout(alertTimerRef.current);
        alertTimerRef.current = window.setTimeout(
          () => setLatestAlert(null),
          7_000,
        );
      }
      setError(false);
    } catch (refreshError) {
      if (refreshError instanceof DOMException && refreshError.name === "AbortError") return;
      setError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setReadIds(getReadIds());
    const controller = new AbortController();
    void refresh(controller.signal);

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, REFRESH_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      if (alertTimerRef.current) window.clearTimeout(alertTimerRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !readIds.has(notification.id)).length,
    [notifications, readIds],
  );

  const markAllRead = useCallback(() => {
    setReadIds((currentReadIds) => {
      const next = [
        ...notifications.map((notification) => notification.id),
        ...currentReadIds,
      ].slice(0, MAX_READ_IDS);
      localStorage.setItem(READ_IDS_KEY, JSON.stringify(next));
      return new Set(next);
    });
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    latestAlert,
    dismissAlert: () => setLatestAlert(null),
    refresh,
    markAllRead,
  };
}
