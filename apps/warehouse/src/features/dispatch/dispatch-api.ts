import { API, wmsFetch } from "@/lib/api";
import type {
  WarehouseDispatchDocument,
  WarehouseDispatchHistory,
  WarehouseDispatchPaymentStatus,
  WarehouseDispatchPaymentMethod,
} from "@mgl/types";
import type { DispatchDestination } from "./types";

export async function dispatchRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await wmsFetch(`${API}${path}`, init);
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok || data === null)
    throw new Error(
      data && typeof data === "object" && "message" in data
        ? String(data.message)
        : "Гаргалтын мэдээллийг ачаалж чадсангүй. Дахин оролдоно уу.",
    );
  return data as T;
}
export const dispatchEndpoint = (warehouseId: string) =>
  `/warehouses/${encodeURIComponent(warehouseId)}/manual-dispatches`;
export function createDispatch(
  warehouseId: string,
  input: DispatchDestination & {
    paymentStatus: WarehouseDispatchPaymentStatus;
    paymentMethod: WarehouseDispatchPaymentMethod | null;
    paymentNote: string;
    requestId: string;
    reason: string;
    note: string;
    items: Array<{ productId: string; quantity: number }>;
  },
) {
  return dispatchRequest<WarehouseDispatchDocument>(
    dispatchEndpoint(warehouseId),
    {
      method: "POST",
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(45000),
    },
  );
}
export function getDispatchHistory(
  warehouseId: string,
  page: number,
  search: string,
  signal: AbortSignal,
) {
  return dispatchRequest<WarehouseDispatchHistory>(
    `${dispatchEndpoint(warehouseId)}?${new URLSearchParams({ page: String(page), search })}`,
    { signal },
  );
}
