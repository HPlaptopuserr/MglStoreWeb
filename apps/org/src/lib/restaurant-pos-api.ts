import type { PosReceipt, PosShift } from "@mgl/types";
import { API, authFetch } from "@/lib/api";

export type RestaurantPosRegister = {
  id: string;
  name: string;
  label: string | null;
  branchId: string;
  organizationId: string;
  isActive: boolean;
  cardEnabled: boolean;
  qpayEnabled: boolean;
  branch: {
    id: string;
    name: string;
  };
};

export type RestaurantPosProduct = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  imageUrl: string | null;
  price: number;
  stockQty: number;
  taxType: "VAT_ABLE" | "VAT_FREE" | "VAT_ZERO" | "NOT_VAT";
  taxRate: number;
  cityTaxRate: number;
  classificationCode: string;
  taxProductCode: string | null;
  measureUnit: string;
  isActive: boolean;
  isRestaurantMenuItem: boolean;
  menuCategory:
    | "HOT"
    | "COLD"
    | "SOUP"
    | "GRILL"
    | "APPETIZER"
    | "DESSERT"
    | "DRINK"
    | null;
  kitchenStation: "HOT_KITCHEN" | "COLD_KITCHEN" | "BAR" | null;
  preparationMinutes: number | null;
};

export type RestaurantTicketLine = {
  id: string;
  productId: string;
  name: string;
  price: number;
  qty: number;
  sentQty: number;
  note: string;
  kitchenStation: string | null;
  preparationMinutes: number | null;
};

export type RestaurantTicket = {
  id: string;
  ticketNo: string;
  organizationId: string;
  branchId: string;
  shiftId: string;
  tableId: string | null;
  orderMode: "DINE_IN" | "TO_GO" | "DELIVERY";
  status: "OPEN" | "KITCHEN" | "READY" | "SERVED" | "PAID" | "CLOSED";
  guestCount: number;
  note: string | null;
  openedAt: string;
  sentAt: string | null;
  closedAt: string | null;
  total: number;
  unsentCount: number;
  items: RestaurantTicketLine[];
  kitchenTickets: Array<{
    id: string;
    kitchenTicketNo: string;
    status: "NEW" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";
    sentAt: string;
  }>;
};

export type RestaurantDiningTable = {
  id: string;
  code: string;
  label: string;
  qrToken: string | null;
  zone: string;
  seats: number;
  status: "FREE" | "OPEN" | "KITCHEN" | "READY" | "PAID";
  total: number;
  currentTicket: RestaurantTicket | null;
};

export type RestaurantPublicMenuProduct = {
  id: string;
  name: string;
  imageUrl: string | null;
  price: number;
  stockQty: number;
  taxType: "VAT_ABLE" | "VAT_FREE" | "VAT_ZERO" | "NOT_VAT";
  taxRate: number;
  cityTaxRate: number;
  classificationCode: string;
  taxProductCode: string | null;
  menuCategory: RestaurantPosProduct["menuCategory"];
  kitchenStation: RestaurantPosProduct["kitchenStation"];
  preparationMinutes: number | null;
};

export type RestaurantPublicMenu = {
  organization: {
    id: string;
    name: string;
  };
  branch: {
    id: string;
    name: string;
  };
  table: {
    id: string;
    code: string;
    label: string;
    zone: string;
    seats: number;
  };
  orderingAvailable: boolean;
  products: RestaurantPublicMenuProduct[];
};

export type KitchenTicketStatus =
  | "NEW"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "CANCELLED";

export type RestaurantKitchenTicket = {
  id: string;
  kitchenTicketNo: string;
  organizationId: string;
  branchId: string;
  status: KitchenTicketStatus;
  sentAt: string;
  startedAt: string | null;
  readyAt: string | null;
  servedAt: string | null;
  restaurantTicket: {
    id: string;
    ticketNo: string;
    orderMode: "DINE_IN" | "TO_GO" | "DELIVERY";
    status: RestaurantTicket["status"];
    table: {
      id: string;
      code: string;
      label: string;
      zone: string;
    } | null;
  };
  items: Array<{
    id: string;
    productId: string;
    name: string;
    qty: number;
    note: string;
    kitchenStation: string | null;
    preparationMinutes: number | null;
  }>;
};

type CreateRestaurantCashSalePayload = {
  shiftId: string;
  branchId: string;
  registerId: string;
  organizationId: string;
  clientSaleId: string;
  restaurantTicketId: string;
  total: number;
  note: string;
  lines: Array<{
    productId: string;
    qty: number;
    unitPrice: number;
    discountAmount: number;
    taxRate: number;
  }>;
};

type CreateRestaurantSalePayload = CreateRestaurantCashSalePayload & {
  paymentMethod: "CASH" | "QPAY";
  qpayInvoiceId?: string;
};

export type RestaurantPosQPayDeepLink = {
  name?: string;
  description?: string;
  logo?: string;
  link: string;
};

export type RestaurantPosQPayInvoice = {
  invoiceId: string;
  providerInvoiceId?: string;
  amount: number;
  qrText: string;
  qrImage?: string;
  deepLinks?: RestaurantPosQPayDeepLink[];
  status: "PENDING" | "PAID" | "EXPIRED";
  expiresAt: string;
  paidAt?: string | null;
  createdAt: string;
};

async function readApiResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : `POS хүсэлт амжилтгүй (HTTP ${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

export async function getRestaurantPosRegisters() {
  const response = await authFetch(`${API}/pos/registers/mine`, {
    cache: "no-store",
  });
  return readApiResponse<RestaurantPosRegister[]>(response);
}

export async function getCurrentRestaurantPosShift() {
  const response = await authFetch(`${API}/pos/shifts/current`, {
    cache: "no-store",
  });
  return readApiResponse<PosShift | null>(response);
}

export async function openRestaurantPosShift(input: {
  branchId: string;
  registerId: string;
  openingCash: number;
}) {
  const response = await authFetch(`${API}/pos/shifts/open`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return readApiResponse<PosShift>(response);
}

export async function closeRestaurantPosShift(input: {
  shiftId: string;
  closingCash: number;
  note?: string;
}) {
  const response = await authFetch(`${API}/pos/shifts/close`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return readApiResponse<PosShift>(response);
}

export async function getRestaurantPosProducts(
  branchId: string,
  options?: { restaurantMenuOnly?: boolean },
) {
  const params = new URLSearchParams({ branchId });
  if (options?.restaurantMenuOnly !== false) {
    params.set("restaurantMenu", "1");
  }
  const response = await authFetch(`${API}/pos/products?${params.toString()}`, {
    cache: "no-store",
  });
  return readApiResponse<RestaurantPosProduct[]>(response);
}

export async function enableRestaurantMenuProduct(input: {
  productId: string;
  menuCategory: NonNullable<RestaurantPosProduct["menuCategory"]>;
  kitchenStation: NonNullable<RestaurantPosProduct["kitchenStation"]>;
  preparationMinutes: number;
}) {
  const response = await authFetch(
    `${API}/products/${encodeURIComponent(input.productId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        isRestaurantMenuItem: true,
        menuCategory: input.menuCategory,
        kitchenStation: input.kitchenStation,
        preparationMinutes: input.preparationMinutes,
      }),
    },
  );
  return readApiResponse<{ id: string }>(response);
}

export async function createRestaurantMenuProduct(input: {
  organizationId: string;
  name: string;
  price: number;
  stock: number;
  menuCategory: NonNullable<RestaurantPosProduct["menuCategory"]>;
  kitchenStation: NonNullable<RestaurantPosProduct["kitchenStation"]>;
  preparationMinutes: number;
}) {
  const response = await authFetch(`${API}/products`, {
    method: "POST",
    body: JSON.stringify({
      organizationId: input.organizationId,
      name: input.name,
      unit: "порц",
      price: input.price,
      stock: input.stock,
      supplyType: "IN_STOCK",
      isRestaurantMenuItem: true,
      menuCategory: input.menuCategory,
      kitchenStation: input.kitchenStation,
      preparationMinutes: input.preparationMinutes,
      taxType: "VAT_ABLE",
      cityTaxRate: 0,
      classificationCode: "4711000",
      images: [],
    }),
  });
  return readApiResponse<{ id: string }>(response);
}

export async function getRestaurantDiningTables(branchId: string) {
  const params = new URLSearchParams({ branchId });
  const response = await authFetch(
    `${API}/restaurant/pos/tables?${params.toString()}`,
    { cache: "no-store" },
  );
  return readApiResponse<RestaurantDiningTable[]>(response);
}

export async function bootstrapRestaurantDiningTables(branchId: string) {
  const response = await authFetch(`${API}/restaurant/pos/tables/bootstrap`, {
    method: "POST",
    body: JSON.stringify({ branchId }),
  });
  return readApiResponse<{ ok: true }>(response);
}

export async function createRestaurantDiningTable(input: {
  branchId: string;
  label: string;
  code?: string;
  zone?: string;
  seats: number;
}) {
  const response = await authFetch(`${API}/restaurant/pos/tables`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return readApiResponse<RestaurantDiningTable>(response);
}

export async function ensureRestaurantTableQrToken(input: {
  branchId: string;
  tableId: string;
}) {
  const response = await authFetch(
    `${API}/restaurant/pos/tables/${encodeURIComponent(input.tableId)}/qr-token`,
    {
      method: "POST",
      body: JSON.stringify({ branchId: input.branchId }),
    },
  );
  return readApiResponse<{
    id: string;
    code: string;
    label: string;
    qrToken: string;
  }>(response);
}

export async function getPublicRestaurantMenu(token: string) {
  const response = await fetch(
    `${API}/restaurant/menu/${encodeURIComponent(token)}`,
    { cache: "no-store" },
  );
  return readApiResponse<RestaurantPublicMenu>(response);
}

export async function createPublicRestaurantOrder(
  token: string,
  input: {
    note?: string;
    lines: Array<{ productId: string; qty: number; note?: string }>;
  },
) {
  const response = await fetch(
    `${API}/restaurant/menu/${encodeURIComponent(token)}/orders`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return readApiResponse<{ ticket: RestaurantTicket; message: string }>(
    response,
  );
}

export type RestaurantPublicQPayDeepLink = {
  name?: string;
  description?: string;
  logo?: string;
  link: string;
};

export type RestaurantPublicQPayInvoice = {
  invoiceId: string;
  providerInvoiceId: string;
  amount: number;
  qrText: string;
  qrImage: string;
  deepLinks: RestaurantPublicQPayDeepLink[];
  status: "PENDING" | "PAID" | "EXPIRED";
  expiresAt: string;
  createdAt: string;
};

export type RestaurantPublicQPayStatus = RestaurantPublicQPayInvoice & {
  paidAt: string | null;
  ticket: RestaurantTicket | null;
  message: string;
};

export async function createPublicRestaurantQPayInvoice(
  token: string,
  input: {
    note?: string;
    lines: Array<{ productId: string; qty: number; note?: string }>;
  },
) {
  const response = await fetch(
    `${API}/restaurant/menu/${encodeURIComponent(token)}/qpay/invoice`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return readApiResponse<RestaurantPublicQPayInvoice>(response);
}

export async function getPublicRestaurantQPayStatus(
  token: string,
  invoiceId: string,
) {
  const response = await fetch(
    `${API}/restaurant/menu/${encodeURIComponent(token)}/qpay/status/${encodeURIComponent(invoiceId)}`,
    { cache: "no-store" },
  );
  return readApiResponse<RestaurantPublicQPayStatus>(response);
}

export async function saveRestaurantTicket(input: {
  branchId: string;
  shiftId: string;
  tableId: string;
  orderMode: "DINE_IN" | "TO_GO" | "DELIVERY";
  note?: string;
  lines: Array<{ productId: string; qty: number; note?: string }>;
}) {
  const response = await authFetch(`${API}/restaurant/pos/tickets`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return readApiResponse<RestaurantTicket | null>(response);
}

export async function sendRestaurantTicketToKitchen(ticketId: string) {
  const response = await authFetch(
    `${API}/restaurant/pos/tickets/${encodeURIComponent(ticketId)}/send-kitchen`,
    { method: "POST" },
  );
  return readApiResponse<{
    ticket: RestaurantTicket;
    kitchenTicket: {
      id: string;
      kitchenTicketNo: string;
      status: string;
      sentAt: string;
    };
    kitchenTickets: Array<{
      id: string;
      kitchenTicketNo: string;
      status: string;
      sentAt: string;
    }>;
  }>(response);
}

export async function cancelRestaurantTicketItem(input: {
  branchId: string;
  ticketId: string;
  itemId: string;
}) {
  const response = await authFetch(
    `${API}/restaurant/pos/tickets/${encodeURIComponent(input.ticketId)}/items/${encodeURIComponent(input.itemId)}/cancel`,
    {
      method: "POST",
      body: JSON.stringify({ branchId: input.branchId }),
    },
  );
  return readApiResponse<RestaurantTicket | null>(response);
}

export async function getRestaurantKitchenTickets(branchId: string) {
  const params = new URLSearchParams({ branchId });
  const response = await authFetch(
    `${API}/restaurant/pos/kitchen-tickets?${params.toString()}`,
    { cache: "no-store" },
  );
  return readApiResponse<RestaurantKitchenTicket[]>(response);
}

export async function updateRestaurantKitchenTicketStatus(input: {
  branchId: string;
  kitchenTicketId: string;
  status: "PREPARING" | "READY" | "SERVED";
}) {
  const response = await authFetch(
    `${API}/restaurant/pos/kitchen-tickets/${encodeURIComponent(input.kitchenTicketId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({
        branchId: input.branchId,
        status: input.status,
      }),
    },
  );
  return readApiResponse<RestaurantKitchenTicket>(response);
}

export async function clearRestaurantDiningTable(input: {
  branchId: string;
  tableId: string;
  forceCancel?: boolean;
}) {
  const response = await authFetch(
    `${API}/restaurant/pos/tables/${encodeURIComponent(input.tableId)}/clear`,
    {
      method: "POST",
      body: JSON.stringify({
        branchId: input.branchId,
        forceCancel: Boolean(input.forceCancel),
      }),
    },
  );
  return readApiResponse<RestaurantDiningTable>(response);
}

export async function createRestaurantQPayInvoice(input: {
  amount: number;
  registerId: string;
  organizationId: string;
}) {
  const response = await authFetch(`${API}/pos/payments/qpay/invoice`, {
    method: "POST",
    body: JSON.stringify({
      amount: input.amount,
      registerId: input.registerId,
      organizationId: input.organizationId,
    }),
  });
  return readApiResponse<RestaurantPosQPayInvoice>(response);
}

export async function getRestaurantQPayInvoiceStatus(invoiceId: string) {
  const response = await authFetch(
    `${API}/pos/payments/qpay/status/${encodeURIComponent(invoiceId)}`,
    { cache: "no-store" },
  );
  return readApiResponse<RestaurantPosQPayInvoice>(response);
}

async function createRestaurantSale(input: CreateRestaurantSalePayload) {
  const response = await authFetch(`${API}/pos/sales`, {
    method: "POST",
    body: JSON.stringify({
      shiftId: input.shiftId,
      branchId: input.branchId,
      registerId: input.registerId,
      organizationId: input.organizationId,
      restaurantTicketId: input.restaurantTicketId,
      clientSaleId: input.clientSaleId,
      paymentMethod: input.paymentMethod,
      paymentBreakdown: [
        {
          method: input.paymentMethod,
          amount: input.total,
          ...(input.qpayInvoiceId ? { invoiceId: input.qpayInvoiceId } : {}),
        },
      ],
      loyalty: { mode: "NONE" },
      lines: input.lines,
      note: input.note,
    }),
  });
  return readApiResponse<PosReceipt>(response);
}

export async function createRestaurantCashSale(
  input: CreateRestaurantCashSalePayload,
) {
  return createRestaurantSale({ ...input, paymentMethod: "CASH" });
}

export async function createRestaurantQPaySale(
  input: CreateRestaurantCashSalePayload & { qpayInvoiceId: string },
) {
  return createRestaurantSale({
    ...input,
    paymentMethod: "QPAY",
    qpayInvoiceId: input.qpayInvoiceId,
  });
}
