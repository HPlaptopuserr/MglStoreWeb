import { API, wmsFetch } from "@/lib/api";
import type { DeliveryPackageDetails } from "@mgl/ui";
import type {
  DeliveryAssignmentPartnership,
  OnlineOrder,
  OnlineOrderStatus,
  OnlineOrdersResponse,
} from "./online-order.types";

function normalizeOrder(order: OnlineOrder): OnlineOrder {
  return {
    ...order,
    subtotal: Number(order.subtotal ?? order.total ?? 0),
    discountAmount: Number(order.discountAmount ?? 0),
    deliveryFee: Number(order.deliveryFee ?? 0),
    total: Number(order.total ?? 0),
    items: Array.isArray(order.items)
      ? order.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity ?? 0),
          price: Number(item.price ?? 0),
          subtotal: Number(item.subtotal ?? 0),
        }))
      : [],
  };
}

export async function fetchDeliveryAssignmentOptions(): Promise<
  DeliveryAssignmentPartnership[]
> {
  const response = await wmsFetch(
    `${API}/warehouse-delivery-assignment-options`,
  );
  const payload = (await response.json()) as {
    partnerships?: DeliveryAssignmentPartnership[];
    message?: string;
  };
  if (!response.ok) {
    throw new Error(payload.message || "Хүргэлтийн сонголт авахад алдаа гарлаа");
  }
  return Array.isArray(payload.partnerships) ? payload.partnerships : [];
}

export async function assignOnlineOrderDelivery(
  orderId: string,
  partnershipId: string,
  courierId: string,
): Promise<void> {
  const response = await wmsFetch(
    `${API}/warehouse-online-orders/${orderId}/assignment`,
    {
      method: "PATCH",
      body: JSON.stringify({ partnershipId, courierId }),
    },
  );
  const payload = (await response.json()) as { message?: string };
  if (!response.ok) {
    throw new Error(payload.message || "Хүргэлт хуваарилахад алдаа гарлаа");
  }
}

export async function fetchOnlineOrders(input: {
  status?: OnlineOrderStatus | "";
  search?: string;
}): Promise<OnlineOrdersResponse> {
  const params = new URLSearchParams({ limit: "100" });
  if (input.status) params.set("status", input.status);
  if (input.search) params.set("search", input.search);

  const response = await wmsFetch(
    `${API}/warehouse-online-orders?${params.toString()}`,
  );
  const payload = (await response.json()) as
    | OnlineOrdersResponse
    | { message?: string };
  if (!response.ok) {
    throw new Error(
      "message" in payload && payload.message
        ? payload.message
        : "Онлайн захиалга авахад алдаа гарлаа",
    );
  }
  const result = payload as OnlineOrdersResponse;
  return {
    total: Number(result.total ?? result.orders?.length ?? 0),
    orders: Array.isArray(result.orders)
      ? result.orders.map(normalizeOrder)
      : [],
  };
}

export async function advanceOnlineOrder(
  orderId: string,
  packageDetails?: DeliveryPackageDetails,
): Promise<void> {
  const response = await wmsFetch(
    `${API}/warehouse-online-orders/${orderId}/status`,
    {
      method: "PATCH",
      body: packageDetails ? JSON.stringify(packageDetails) : undefined,
    },
  );
  const payload = (await response.json()) as { message?: string };
  if (!response.ok) {
    throw new Error(payload.message || "Захиалгын төлөв шинэчлэхэд алдаа гарлаа");
  }
}
