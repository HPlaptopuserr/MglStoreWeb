import { API, wmsFetch } from "@/lib/api";
import type { WarehouseNotificationsResponse } from "./warehouse-notification.types";

export async function fetchWarehouseNotifications(
  signal?: AbortSignal,
): Promise<WarehouseNotificationsResponse> {
  const response = await wmsFetch(`${API}/warehouse-notifications`, { signal });
  if (!response.ok) {
    throw new Error(`Warehouse notifications request failed: ${response.status}`);
  }
  return (await response.json()) as WarehouseNotificationsResponse;
}
