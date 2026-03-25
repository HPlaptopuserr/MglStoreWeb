const BLOCKED_CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

export function sanitizeReceiptNote(input: string | undefined): string | undefined {
  if (!input) return undefined;
  return input.replace(BLOCKED_CONTROL_CHARS, "").trim().slice(0, 500);
}

export function toSafePositiveNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.round(parsed * 100) / 100;
}

export function assertNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}
