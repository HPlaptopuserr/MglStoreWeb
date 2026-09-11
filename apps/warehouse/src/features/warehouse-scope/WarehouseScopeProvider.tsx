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
import { API, wmsFetch } from "@/lib/api";

const STORAGE_KEY = "wms_selected_warehouse_id";

export interface AccessibleWarehouse {
  id: string;
  name: string;
  address?: string | null;
  organizations?: Array<{ id: string; name: string }>;
}

interface WarehouseScopeValue {
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
  const [warehouses, setWarehouses] = useState<AccessibleWarehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshWarehouses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await wmsFetch(`${API}/warehouses`);
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          "message" in payload &&
          typeof payload.message === "string"
            ? payload.message
            : "Агуулахын мэдээлэл авахад алдаа гарлаа";
        throw new Error(message);
      }

      const list = (Array.isArray(payload)
        ? payload
        : payload && typeof payload === "object" && "warehouses" in payload
          ? payload.warehouses
          : []) as AccessibleWarehouse[];
      setWarehouses(list);
      setSelectedWarehouseId((current) => {
        const stored = window.localStorage.getItem(STORAGE_KEY) || "";
        const next = [current, stored].find((id) =>
          list.some((warehouse) => warehouse.id === id),
        ) ?? list[0]?.id ?? "";
        if (next) window.localStorage.setItem(STORAGE_KEY, next);
        else window.localStorage.removeItem(STORAGE_KEY);
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
      window.localStorage.setItem(STORAGE_KEY, warehouseId);
    },
    [warehouses],
  );

  const selectedWarehouse = useMemo(
    () =>
      warehouses.find((warehouse) => warehouse.id === selectedWarehouseId) ??
      null,
    [selectedWarehouseId, warehouses],
  );

  const value = useMemo<WarehouseScopeValue>(
    () => ({
      warehouses,
      selectedWarehouse,
      selectedWarehouseId,
      isLoading,
      error,
      selectWarehouse,
      refreshWarehouses,
    }),
    [
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
    throw new Error("useWarehouseScope must be used inside WarehouseScopeProvider");
  }
  return context;
}
