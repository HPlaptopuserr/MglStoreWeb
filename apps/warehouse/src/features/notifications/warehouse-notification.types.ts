export type WarehouseNotificationSeverity = "critical" | "warning" | "info";
export const WAREHOUSE_ONLINE_ORDER_EVENT = "wms:new-online-order";

export interface WarehouseNotification {
  id: string;
  type:
    | "OUT_OF_STOCK"
    | "LOW_STOCK"
    | "STOCK_REQUEST"
    | "EXPIRING"
    | "ONLINE_ORDER";
  severity: WarehouseNotificationSeverity;
  title: string;
  message: string;
  detail: string;
  href: string;
  occurredAt: string;
}

export interface WarehouseNotificationsResponse {
  notifications: WarehouseNotification[];
  generatedAt: string;
}
