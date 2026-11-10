import { PosPaymentStatus } from "@mgl/database";

const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;

const text = (value: unknown): string =>
  typeof value === "string" || typeof value === "number" ? String(value).trim() : "";

const bankReferenceKeys = new Set([
  "rrn", "invoice", "traceno", "systemref", "appcode", "approvalcode",
  "approvecode", "authcode", "authorizationcode",
]);

const hasBankEvidence = (value: Record<string, unknown>): boolean =>
  Object.entries(value).some(([key, field]) =>
    bankReferenceKeys.has(key.replace(/[^a-z0-9]/gi, "").toLowerCase()) && Boolean(text(field)),
  );

/**
 * Older Android PGW bridges label unrecognized negative terminal codes FAILED.
 * Recognize only the observed -21 cancellation, with the original attempt and
 * terminal response intact. A transport error or absence of RRN is not a decline.
 */
export function hasAndroidPgwCancellation(result: unknown, attemptId: string): boolean {
  const bridge = record(result);
  const parsed = record(bridge?.parsed);
  if (!bridge || !parsed || bridge.provider !== "ANDROID_PGW" ||
      text(bridge.status).toUpperCase() !== "FAILED" || bridge.manualCard === true) return false;
  if (text(bridge.code) !== "-21" || text(parsed.code) !== "-21" ||
      text(bridge.message) !== "Гүйлгээ цуцлагдсан" || text(parsed.desc) !== "Гүйлгээ цуцлагдсан") return false;
  if (!attemptId || text(bridge.data) !== attemptId ||
      (text(parsed.data) && text(parsed.data) !== attemptId)) return false;
  if (!text(parsed.terminal) || text(bridge.terminal) !== text(parsed.terminal)) return false;
  // The bridge uses the attempt ID as a fallback transactionId, not bank proof.
  if ((text(bridge.transactionId) && text(bridge.transactionId) !== attemptId) ||
      text(parsed.transactionId) || hasBankEvidence(bridge) || hasBankEvidence(parsed)) return false;
  if ([parsed.status, parsed.result, parsed.success, parsed.succeed].some(value =>
    value === true || ["APPROVED", "SUCCESS", "SUCCEEDED", "SUCCESSFUL", "TRUE"].includes(text(value).toUpperCase()),
  )) return false;
  return true;
}

export function androidPgwResultStatus(result: Record<string, unknown>, attemptId: string): PosPaymentStatus {
  const status = text(result.status || result.Status).toUpperCase();
  if (status === "APPROVED") return PosPaymentStatus.APPROVED;
  if (status === "DECLINED" || hasAndroidPgwCancellation(result, attemptId)) return PosPaymentStatus.DECLINED;
  return PosPaymentStatus.PENDING;
}
