import type { QPayMerchantContext } from "./qpay.types";

const QUICKQR_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isQuickQrMerchantId(value?: string | null): boolean {
  return QUICKQR_UUID_PATTERN.test(String(value || "").trim());
}

export function isQuickQrContext(context?: QPayMerchantContext | null): boolean {
  return isQuickQrMerchantId(context?.merchantId);
}

export function buildQuickQrMerchantKey(prefix: string, merchantId: string): string {
  return `${prefix}:${merchantId}`;
}

export function redactQPayRegistrationResponse(raw: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeyPattern = /(password|secret|key|token|credential)/i;
  return Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      sensitiveKeyPattern.test(key) && value ? "[redacted]" : value,
    ]),
  );
}
