import type { WarehouseDividendVerification } from "@mgl/types";

export function storePendingDividend(
  key: string,
  session: WarehouseDividendVerification | null,
) {
  try {
    if (session) sessionStorage.setItem(key, JSON.stringify(session));
    else sessionStorage.removeItem(key);
  } catch {
    /* Verification still works when browser storage is unavailable. */
  }
}

export function readPendingDividend(
  key: string,
): WarehouseDividendVerification | null {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(key) || "null");
    if (!value || typeof value !== "object") return null;
    const session = value as Record<string, unknown>;
    if (
      [
        "id",
        "shortcode",
        "text",
        "smsUri",
        "displayInstruction",
        "expiresAt",
      ].every((field) => typeof session[field] === "string") &&
      /^sms:[0-9]+\?body=/.test(String(session.smsUri)) &&
      Date.parse(String(session.expiresAt)) > Date.now()
    )
      return session as unknown as WarehouseDividendVerification;
  } catch {
    /* Ignore invalid or expired local state; the server owns confirmation. */
  }
  storePendingDividend(key, null);
  return null;
}
