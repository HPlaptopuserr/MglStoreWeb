import type {
  CardAttempt,
  CashDenominationCount,
  CashDrawerSummary,
  PosCreditBorrower,
  PosReceipt,
  PosShift,
  PosShiftHistoryResponse,
  SaleCreditPaymentMeta,
} from "@mgl/types";
import { API, authFetch } from "@/lib/api";

export type RestaurantPosRegister = {
  id: string;
  name: string;
  label: string | null;
  branchId: string;
  organizationId: string;
  isActive: boolean;
  cardEnabled: boolean;
  cardProviderType: string | null;
  cardTerminalId: string | null;
  terminalBridgeUrl: string | null;
  hasOwnCardTerminal?: boolean;
  cardTerminalSource?: "REGISTER" | "ORG_REGISTER" | "CARD_TERMINAL_REQUEST" | null;
  cardTerminalSourceRegisterId?: string | null;
  cardTerminalSourceRequestId?: string | null;
  qpayEnabled: boolean;
  minuAgentEnabled?: boolean;
  minuAgentUsername?: string | null;
  minuAgentBranchId?: string | null;
  minuAgentConnectedAt?: string | null;
  minuAgentPasswordSet?: boolean;
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
  status: "OPEN" | "KITCHEN" | "READY" | "SERVED" | "PAID" | "CLOSED" | "CANCELLED";
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

export type RestaurantCreditSaleLine = {
  id: string;
  productId: string;
  productName: string;
  productSku: string | null;
  qty: number;
  unitPrice: number;
  taxAmount: number;
  discount: number;
  lineTotal: number;
};

export type RestaurantCreditSale = {
  id: string;
  customerId: string | null;
  saleId: string;
  receiptNo: string;
  status: string;
  targetType: string;
  borrowerId: string;
  borrowerName: string;
  borrowerPhone: string | null;
  borrowerEmail: string | null;
  borrowerAddress: string | null;
  employeeId: string | null;
  employeeName: string | null;
  principalAmount: number;
  monthlyInterestRate: number;
  totalInterest: number;
  totalDue: number;
  termMonths: number;
  dueDate: string | null;
  paidAt: string | null;
  paidAmount: number | null;
  paymentMethod: string | null;
  paymentNote: string | null;
  createdAt: string;
  lines: RestaurantCreditSaleLine[];
};

export type RestaurantSalesHistoryLine = {
  productId: string;
  productName: string;
  productSku: string | null;
  qty: number;
  unitPrice: number;
  taxAmount: number;
  taxType: string;
  taxRate: number;
  cityTaxRate: number;
  cityTaxAmount: number;
  classificationCode: string | null;
  taxProductCode: string | null;
  measureUnit: string | null;
  discount: number;
  lineTotal: number;
};

export type RestaurantSalesHistoryItem = {
  id: string;
  receiptNo: string;
  branchName: string;
  registerName: string | null;
  cashierName: string;
  paymentMethod: string;
  status: string;
  voidedAt: string | null;
  voidReason: string | null;
  ebarimt: unknown;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  createdAt: string;
  lines: RestaurantSalesHistoryLine[];
};

export type RestaurantSalesHistoryResponse = {
  total: number;
  page: number;
  limit: number;
  pages: number;
  sales: RestaurantSalesHistoryItem[];
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
  paymentMethod: "CASH" | "CARD" | "QPAY" | "CREDIT";
  cardAttemptId?: string;
  cardTransactionId?: string;
  qpayInvoiceId?: string;
  credit?: SaleCreditPaymentMeta;
};

export type RestaurantCardTerminalProvider = "ANDROID_PGW" | "MINU_AGENT";

export type RestaurantCardTerminalConnectInput =
  | {
      registerId: string;
      useExisting: true;
    }
  | {
      registerId: string;
      providerType: "ANDROID_PGW";
      terminalBridgeUrl?: string;
    }
  | {
      registerId: string;
      providerType: "MINU_AGENT";
      cardTerminalId: string;
      minuAgentUsername?: string;
      minuAgentPassword?: string;
      minuAgentBranchId?: string;
    };

export type RestaurantClientBridgeChargeResult = {
  status?: string;
  transactionId?: string;
  message?: string;
  [key: string]: unknown;
};

type RestaurantClientBridgeHealth = {
  ok?: boolean;
  provider?: string;
  message?: string;
  serialPath?: string;
  raw?: string;
  [key: string]: unknown;
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

export async function connectRestaurantCardTerminal(
  input: RestaurantCardTerminalConnectInput,
) {
  const { registerId, ...body } = input;
  const response = await authFetch(
    `${API}/pos/registers/${encodeURIComponent(registerId)}/card-terminal/connect`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
  return readApiResponse<RestaurantPosRegister>(response);
}

export async function createRestaurantCardAttempt(input: {
  amount: number;
  terminalId?: string | null;
  bridgeUrl?: string | null;
  registerId: string;
  organizationId: string;
  clientBridge?: boolean;
}) {
  const response = await authFetch(`${API}/pos/payments/card/authorize`, {
    method: "POST",
    body: JSON.stringify({
      amount: input.amount,
      terminalId: input.terminalId || "terminal-1",
      bridgeUrl: input.bridgeUrl || null,
      registerId: input.registerId,
      organizationId: input.organizationId,
      clientBridge: input.clientBridge === true,
    }),
  });
  return readApiResponse<CardAttempt>(response);
}

export async function getRestaurantCardAttemptStatus(attemptId: string) {
  const response = await authFetch(
    `${API}/pos/payments/card/status/${encodeURIComponent(attemptId)}`,
    { cache: "no-store" },
  );
  return readApiResponse<CardAttempt>(response);
}

export async function submitRestaurantClientBridgeResult(input: {
  attemptId: string;
  result: RestaurantClientBridgeChargeResult;
}) {
  const response = await authFetch(
    `${API}/pos/payments/card/client-bridge-result`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return readApiResponse<CardAttempt>(response);
}

async function getRestaurantClientBridgeHealth(
  bridgeUrl: string,
  signal?: AbortSignal,
): Promise<RestaurantClientBridgeHealth> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8_000);
  const abortFromCaller = () => controller.abort();

  try {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    signal?.addEventListener("abort", abortFromCaller, { once: true });

    const response = await fetch(`${bridgeUrl}/health`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    const data = (await response.json().catch(() => ({}))) as RestaurantClientBridgeHealth;
    if (!response.ok) {
      throw new Error(String(data.message || `Bridge health HTTP ${response.status}`));
    }
    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("POS bridge health шалгах хугацаа дууслаа");
    }
    throw error;
  } finally {
    signal?.removeEventListener("abort", abortFromCaller);
    window.clearTimeout(timeout);
  }
}

export async function chargeRestaurantClientBridge(input: {
  bridgeUrl: string;
  attemptId: string;
  amount: number;
  terminalId: string;
  signal?: AbortSignal;
}): Promise<RestaurantClientBridgeChargeResult> {
  const bridgeUrl = input.bridgeUrl.replace(/\/$/, "");
  const health = await getRestaurantClientBridgeHealth(bridgeUrl, input.signal);
  const provider = String(health.provider || "").toLowerCase();

  if (provider && provider !== "android-pgw") {
    throw new Error(
      `POS bridge provider ${health.provider} байна. BRIDGE_PROVIDER=android-pgw болгож bridge restart хийнэ үү.`,
    );
  }

  if (health.ok === false) {
    throw new Error(health.message || "Android PGW terminal холбогдоогүй байна");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 120_000);
  const abortFromCaller = () => controller.abort();

  try {
    if (input.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    input.signal?.addEventListener("abort", abortFromCaller, { once: true });

    const response = await fetch(`${bridgeUrl}/charge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attemptId: input.attemptId,
        amount: input.amount,
        terminalId: input.terminalId,
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await response.text();
    let data: RestaurantClientBridgeChargeResult = {};
    if (text) {
      try {
        data = JSON.parse(text) as RestaurantClientBridgeChargeResult;
      } catch {
        data = { status: "FAILED", message: text.slice(0, 220) };
      }
    }

    if (!response.ok) {
      throw new Error(String(data.message || `Bridge HTTP ${response.status}`));
    }
    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Terminal хариу өгөх хугацаа дууслаа");
    }
    throw error;
  } finally {
    input.signal?.removeEventListener("abort", abortFromCaller);
    window.clearTimeout(timeout);
  }
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
  cashCount?: CashDenominationCount[];
  note?: string;
}) {
  const response = await authFetch(`${API}/pos/shifts/close`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return readApiResponse<PosShift>(response);
}

export async function getRestaurantCashDrawerSummary(
  shiftId: string,
  signal?: AbortSignal,
) {
  const response = await authFetch(
    `${API}/pos/shifts/${encodeURIComponent(shiftId)}/drawer`,
    {
      cache: "no-store",
      signal,
    },
  );
  return readApiResponse<CashDrawerSummary>(response);
}

export async function getRestaurantShiftHistory(
  input: {
    branchId?: string;
    status?: "OPEN" | "CLOSED";
    from?: string;
    to?: string;
    limit?: number;
  } = {},
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();
  if (input.branchId) params.set("branchId", input.branchId);
  if (input.status) params.set("status", input.status);
  if (input.from) params.set("from", input.from);
  if (input.to) params.set("to", input.to);
  if (input.limit) params.set("limit", String(input.limit));
  const response = await authFetch(
    `${API}/pos/shifts/history?${params.toString()}`,
    {
      cache: "no-store",
      signal,
    },
  );
  return readApiResponse<PosShiftHistoryResponse>(response);
}

export async function getRestaurantPosProducts(
  branchId: string,
  options?: { restaurantMenuOnly?: boolean },
) {
  const params = new URLSearchParams({ branchId });
  if (options?.restaurantMenuOnly !== false) {
    params.set("restaurantMenu", "1");
  } else {
    params.set("includeAllSupplyTypes", "1");
  }
  const response = await authFetch(`${API}/pos/products?${params.toString()}`, {
    cache: "no-store",
  });
  return readApiResponse<RestaurantPosProduct[]>(response);
}

export async function getRestaurantCreditCustomers(
  organizationId: string,
  options?: { search?: string; limit?: number },
) {
  const params = new URLSearchParams({
    organizationId,
    limit: String(options?.limit ?? 100),
  });
  const search = options?.search?.trim();
  if (search) {
    params.set("search", search);
  }
  const response = await authFetch(
    `${API}/pos/credit-customers?${params.toString()}`,
    { cache: "no-store" },
  );
  const payload = await readApiResponse<{ customers?: PosCreditBorrower[] }>(
    response,
  );
  return Array.isArray(payload.customers) ? payload.customers : [];
}

export async function getRestaurantCreditSales(
  organizationId: string,
  options?: { branchId?: string; limit?: number },
) {
  const params = new URLSearchParams({
    organizationId,
    limit: String(options?.limit ?? 100),
  });
  if (options?.branchId) {
    params.set("branchId", options.branchId);
  }
  const response = await authFetch(
    `${API}/pos/credit-sales?${params.toString()}`,
    { cache: "no-store" },
  );
  const payload = await readApiResponse<{ credits?: RestaurantCreditSale[] }>(
    response,
  );
  return Array.isArray(payload.credits) ? payload.credits : [];
}

export async function getRestaurantSalesHistory(
  organizationId: string,
  options: {
    branchId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  } = {},
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({
    organizationId,
    page: String(options.page ?? 1),
    limit: String(options.limit ?? 8),
  });
  if (options.branchId) params.set("branchId", options.branchId);
  if (options.from) params.set("from", options.from);
  if (options.to) params.set("to", options.to);

  const response = await authFetch(
    `${API}/pos/sales/history?${params.toString()}`,
    { cache: "no-store", signal },
  );
  return readApiResponse<RestaurantSalesHistoryResponse>(response);
}

export async function voidRestaurantSale(saleId: string, reason: string) {
  const response = await authFetch(
    `${API}/pos/sales/${encodeURIComponent(saleId)}/void`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    },
  );
  return readApiResponse<{ ok: boolean; message: string }>(response);
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
          ...(input.cardAttemptId ? { attemptId: input.cardAttemptId } : {}),
          ...(input.cardTransactionId
            ? { transactionId: input.cardTransactionId }
            : {}),
          ...(input.qpayInvoiceId ? { invoiceId: input.qpayInvoiceId } : {}),
          ...(input.credit ? { credit: input.credit } : {}),
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

export async function createRestaurantCardSale(
  input: CreateRestaurantCashSalePayload & {
    cardAttemptId: string;
    cardTransactionId?: string | null;
  },
) {
  return createRestaurantSale({
    ...input,
    paymentMethod: "CARD",
    cardAttemptId: input.cardAttemptId,
    cardTransactionId: input.cardTransactionId || undefined,
  });
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

export async function createRestaurantCreditSale(
  input: CreateRestaurantCashSalePayload & { credit: SaleCreditPaymentMeta },
) {
  return createRestaurantSale({
    ...input,
    paymentMethod: "CREDIT",
    credit: input.credit,
  });
}

type PayRestaurantCreditSaleInput =
  | {
      creditSaleId: string;
      amount: number;
      paymentMethod: "CASH";
      shiftId: string;
      note?: string;
    }
  | {
      creditSaleId: string;
      amount: number;
      paymentMethod: "QPAY";
      qpayInvoiceId: string;
      note?: string;
    }
  | {
      creditSaleId: string;
      amount: number;
      paymentMethod: "CARD";
      cardAttemptId: string;
      note?: string;
    };

export async function payRestaurantCreditSale(
  input: PayRestaurantCreditSaleInput,
) {
  const response = await authFetch(
    `${API}/pos/credit-sales/${encodeURIComponent(input.creditSaleId)}/pay`,
    {
      method: "POST",
      body: JSON.stringify({
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        ...("shiftId" in input ? { shiftId: input.shiftId } : {}),
        ...("qpayInvoiceId" in input
          ? { qpayInvoiceId: input.qpayInvoiceId }
          : {}),
        ...("cardAttemptId" in input
          ? { cardAttemptId: input.cardAttemptId }
          : {}),
        note: input.note,
      }),
    },
  );
  return readApiResponse<{ credit: RestaurantCreditSale }>(response);
}

type PayRestaurantCreditSalesBulkInput =
  | {
      creditSaleIds: string[];
      amount: number;
      paymentMethod: "CASH";
      shiftId: string;
      note?: string;
    }
  | {
      creditSaleIds: string[];
      amount: number;
      paymentMethod: "QPAY";
      qpayInvoiceId: string;
      note?: string;
    }
  | {
      creditSaleIds: string[];
      amount: number;
      paymentMethod: "CARD";
      cardAttemptId: string;
      note?: string;
    };

export async function payRestaurantCreditSalesBulk(
  input: PayRestaurantCreditSalesBulkInput,
) {
  const response = await authFetch(`${API}/pos/credit-sales/pay-bulk`, {
    method: "POST",
    body: JSON.stringify({
      creditSaleIds: input.creditSaleIds,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      ...("shiftId" in input ? { shiftId: input.shiftId } : {}),
      ...("qpayInvoiceId" in input
        ? { qpayInvoiceId: input.qpayInvoiceId }
        : {}),
      ...("cardAttemptId" in input
        ? { cardAttemptId: input.cardAttemptId }
        : {}),
      note: input.note,
    }),
  });
  return readApiResponse<{
    credits: RestaurantCreditSale[];
    paidAmount: number;
  }>(response);
}
