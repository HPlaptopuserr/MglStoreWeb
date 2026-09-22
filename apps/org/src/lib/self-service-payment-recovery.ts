import type { CardAttempt } from "@mgl/types";
import type {
  RestaurantPosProduct,
  RestaurantPosQPayInvoice,
  RestaurantTicket,
} from "@/lib/restaurant-pos-api";
import type { EbarimtBuyer } from "@/lib/ebarimt";

export type SelfServiceOrderMode = "DINE_IN" | "TO_GO";

export type SelfServiceCartLine = {
  product: RestaurantPosProduct;
  qty: number;
};

export type SelfServicePendingCheckout = {
  ticket: RestaurantTicket;
  invoice: RestaurantPosQPayInvoice;
  clientSaleId: string;
  shiftId: string;
  total: number;
  packagingFee: number;
  lines: SelfServiceCartLine[];
  ebarimtBuyer: EbarimtBuyer;
};

export type SelfServicePendingCardCheckout = Omit<
  SelfServicePendingCheckout,
  "invoice"
> & {
  cardAttempt: CardAttempt;
};

export type SelfServicePendingPayment =
  | {
      version: 1;
      organizationId: string;
      registerId: string;
      orderMode: SelfServiceOrderMode;
      paymentMethod: "QPAY";
      savedAt: string;
      checkout: SelfServicePendingCheckout;
    }
  | {
      version: 1;
      organizationId: string;
      registerId: string;
      orderMode: SelfServiceOrderMode;
      paymentMethod: "CARD";
      savedAt: string;
      checkout: SelfServicePendingCardCheckout;
    };

export const SELF_SERVICE_PENDING_PAYMENT_STORAGE_KEY =
  "org_self_service_pending_payment_v1";

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

type PendingCheckoutBase = Omit<SelfServicePendingCheckout, "invoice">;

function isCheckoutBase(value: unknown): value is PendingCheckoutBase {
  if (!isObject(value)) return false;
  if (
    !isObject(value.ticket) ||
    !isNonEmptyString(value.ticket.id) ||
    !isNonEmptyString(value.ticket.ticketNo) ||
    !isNonEmptyString(value.clientSaleId) ||
    !isNonEmptyString(value.shiftId) ||
    !isFiniteNumber(value.total) ||
    value.total <= 0 ||
    !isFiniteNumber(value.packagingFee) ||
    !Array.isArray(value.lines) ||
    value.lines.length === 0 ||
    !isObject(value.ebarimtBuyer)
  ) {
    return false;
  }

  if (
    value.ebarimtBuyer.type !== "B2C" &&
    value.ebarimtBuyer.type !== "B2B"
  ) {
    return false;
  }

  return value.lines.every(
    (line) =>
      isObject(line) &&
      isObject(line.product) &&
      isNonEmptyString(line.product.id) &&
      isFiniteNumber(line.product.price) &&
      isFiniteNumber(line.qty) &&
      line.qty > 0,
  );
}

export function parseSelfServicePendingPayment(
  value: unknown,
): SelfServicePendingPayment | null {
  const checkout = isObject(value) ? value.checkout : null;
  if (
    !isObject(value) ||
    value.version !== 1 ||
    !isNonEmptyString(value.organizationId) ||
    !isNonEmptyString(value.registerId) ||
    (value.orderMode !== "DINE_IN" && value.orderMode !== "TO_GO") ||
    !isNonEmptyString(value.savedAt) ||
    !isCheckoutBase(checkout)
  ) {
    return null;
  }

  if (value.paymentMethod === "QPAY") {
    const invoice = isObject(value.checkout)
      ? value.checkout.invoice
      : null;
    if (
      !isObject(invoice) ||
      !isNonEmptyString(invoice.invoiceId) ||
      !isFiniteNumber(invoice.amount) ||
      !["PENDING", "PAID", "EXPIRED"].includes(String(invoice.status))
    ) {
      return null;
    }
    return value as SelfServicePendingPayment;
  }

  if (value.paymentMethod === "CARD") {
    const attempt = isObject(value.checkout)
      ? value.checkout.cardAttempt
      : null;
    if (
      !isObject(attempt) ||
      !isNonEmptyString(attempt.attemptId) ||
      !isFiniteNumber(attempt.amount) ||
      (attempt.status !== "PENDING" && attempt.status !== "APPROVED")
    ) {
      return null;
    }
    return value as SelfServicePendingPayment;
  }

  return null;
}

export function loadSelfServicePendingPayment() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(
    SELF_SERVICE_PENDING_PAYMENT_STORAGE_KEY,
  );
  if (!raw) return null;

  try {
    const parsed = parseSelfServicePendingPayment(JSON.parse(raw));
    if (!parsed) {
      window.localStorage.removeItem(
        SELF_SERVICE_PENDING_PAYMENT_STORAGE_KEY,
      );
    }
    return parsed;
  } catch {
    window.localStorage.removeItem(SELF_SERVICE_PENDING_PAYMENT_STORAGE_KEY);
    return null;
  }
}

export function saveSelfServicePendingPayment(
  payment: Omit<SelfServicePendingPayment, "version" | "savedAt">,
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    SELF_SERVICE_PENDING_PAYMENT_STORAGE_KEY,
    JSON.stringify({
      ...payment,
      version: 1,
      savedAt: new Date().toISOString(),
    }),
  );
}

export function clearSelfServicePendingPayment() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SELF_SERVICE_PENDING_PAYMENT_STORAGE_KEY);
}
