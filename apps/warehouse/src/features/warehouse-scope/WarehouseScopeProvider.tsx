"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { WarehouseViewerSession } from "@mgl/types";
import { API, wmsFetch } from "@/lib/api";

const LEGACY_STORAGE_KEY = "wms_selected_warehouse_id";

function getSelectionStorageKey() {
  try {
    const user = JSON.parse(
      window.localStorage.getItem("wms_user") || "{}",
    ) as {
      id?: string;
    };
    return user.id ? `${LEGACY_STORAGE_KEY}:${user.id}` : LEGACY_STORAGE_KEY;
  } catch {
    return LEGACY_STORAGE_KEY;
  }
}

export interface AccessibleWarehouse {
  id: string;
  name: string;
  address?: string | null;
  accessMode?: "OPERATOR" | "VIEWER";
  organizations?: Array<{ id: string; name: string }>;
}

interface WarehouseScopeValue {
  viewerOnly: boolean;
  warehouses: AccessibleWarehouse[];
  selectedWarehouse: AccessibleWarehouse | null;
  selectedWarehouseId: string;
  isLoading: boolean;
  error: string | null;
  selectWarehouse: (warehouseId: string) => void;
  refreshWarehouses: () => Promise<void>;
}

const WarehouseScopeContext = createContext<WarehouseScopeValue | null>(null);

export function WarehouseScopeProvider({ children }: { children: ReactNode }) {
  const [sessionViewerOnly, setViewerOnly] = useState(false);
  const [warehouses, setWarehouses] = useState<AccessibleWarehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshWarehouses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sessionResponse = await wmsFetch(`${API}/warehouse-viewer/session`);
      if (!sessionResponse.ok)
        throw new Error("Хандах эрхийг шалгаж чадсангүй. Дахин нэвтэрнэ үү.");
      const session = (await sessionResponse.json()) as WarehouseViewerSession;
      setViewerOnly(session.viewerOnly);
      const list: AccessibleWarehouse[] = session.warehouses;
      setWarehouses(list);
      setSelectedWarehouseId((current) => {
        const storageKey = getSelectionStorageKey();
        const stored =
          window.localStorage.getItem(storageKey) ||
          window.localStorage.getItem(LEGACY_STORAGE_KEY) ||
          "";
        const next =
          [current, stored].find((id) =>
            list.some((warehouse) => warehouse.id === id),
          ) ??
          list[0]?.id ??
          "";
        if (next) window.localStorage.setItem(storageKey, next);
        else window.localStorage.removeItem(storageKey);
        if (storageKey !== LEGACY_STORAGE_KEY) {
          window.localStorage.removeItem(LEGACY_STORAGE_KEY);
        }
        return next;
      });
    } catch (loadError) {
      setWarehouses([]);
      setSelectedWarehouseId("");
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Агуулахын мэдээлэл авахад алдаа гарлаа",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshWarehouses();
  }, [refreshWarehouses]);

  const selectWarehouse = useCallback(
    (warehouseId: string) => {
      if (!warehouses.some((warehouse) => warehouse.id === warehouseId)) return;
      setSelectedWarehouseId(warehouseId);
      window.localStorage.setItem(getSelectionStorageKey(), warehouseId);
    },
    [warehouses],
  );

  const selectedWarehouse = useMemo(
    () =>
      warehouses.find((warehouse) => warehouse.id === selectedWarehouseId) ??
      null,
    [selectedWarehouseId, warehouses],
  );

  const viewerOnly =
    selectedWarehouse?.accessMode === "VIEWER" || sessionViewerOnly;

  const value = useMemo<WarehouseScopeValue>(
    () => ({
      viewerOnly,
      warehouses,
      selectedWarehouse,
      selectedWarehouseId,
      isLoading,
      error,
      selectWarehouse,
      refreshWarehouses,
    }),
    [
      viewerOnly,
      warehouses,
      selectedWarehouse,
      selectedWarehouseId,
      isLoading,
      error,
      selectWarehouse,
      refreshWarehouses,
    ],
  );

  return (
    <WarehouseScopeContext.Provider value={value}>
      {children}
    </WarehouseScopeContext.Provider>
  );
}

export function useWarehouseScope() {
  const context = useContext(WarehouseScopeContext);
  if (!context) {
    throw new Error(
      "useWarehouseScope must be used inside WarehouseScopeProvider",
    );
  }
  return context;
}
