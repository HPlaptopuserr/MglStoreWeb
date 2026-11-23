import type { CustomerDisplayPayload } from "../types/customer-display.types";

export const CUSTOMER_DISPLAY_PAYLOAD_KEY = "mgl_pos_customer_payload";
export const CUSTOMER_DISPLAY_CHANNEL = "mgl-pos-customer-display";
export const CUSTOMER_DISPLAY_REQUEST = "mgl-pos-request-customer-display";

type DisplayStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type DisplayChannel = Pick<BroadcastChannel, "postMessage">;

export function readDisplayStorage(
  key: string,
  storage: () => DisplayStorage,
): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

/** This is a disposable display snapshot, never checkout or payment recovery state. */
export function publishCustomerDisplayPayload(
  payload: CustomerDisplayPayload,
  storage: () => DisplayStorage,
  channel: DisplayChannel | null,
): void {
  try {
    storage().setItem(CUSTOMER_DISPLAY_PAYLOAD_KEY, JSON.stringify(payload));
  } catch {
    // Remove only the stale display cache; a full browser store must not crash POS.
    try {
      storage().removeItem(CUSTOMER_DISPLAY_PAYLOAD_KEY);
    } catch {
      /* Storage can be disabled. */
    }
  }
  sendCustomerDisplayPayload(payload, channel);
}

export function sendCustomerDisplayPayload(
  payload: CustomerDisplayPayload,
  channel: DisplayChannel | null,
): void {
  try {
    channel?.postMessage(payload);
  } catch {
    /* A closed display must not stop checkout. */
  }
}

export function createCustomerDisplayChannel(): BroadcastChannel | null {
  try {
    return new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL);
  } catch {
    return null;
  }
}

export function readCustomerDisplayPayload(
  value: unknown,
): CustomerDisplayPayload | null {
  if (
    !value ||
    typeof value !== "object" ||
    !("lines" in value) ||
    !Array.isArray(value.lines) ||
    !("totals" in value) ||
    !value.totals ||
    typeof value.totals !== "object" ||
    !("ts" in value) ||
    typeof value.ts !== "number" ||
    !Number.isFinite(value.ts)
  )
    return null;
  const totals = value.totals as Record<string, unknown>;
  if (
    !["subTotal", "taxTotal", "discountTotal", "grandTotal"].every(
      (key) => typeof totals[key] === "number" && Number.isFinite(totals[key]),
    )
  )
    return null;
  return value as CustomerDisplayPayload;
}
