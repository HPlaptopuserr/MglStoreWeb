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

/** Call only AFTER paired bridge signature and original request envelope checks.
 * This recovers a terminal cancellation captured on the original purchase
 * connection; it must never normalize an unsigned browser/legacy result. */
export function normalizeVerifiedAndroidPgwCancellation(
  result: Record<string, unknown>,
  request: { attemptId: string; amount: number; terminalId: string },
): Record<string, unknown> {
  const parsed = record(result.parsed);
  if (result.provider !== "ANDROID_PGW" || result.status !== "FAILED" || !parsed ||
      result.manualCard === true || result.attemptId !== request.attemptId ||
      Number(result.requestAmount) !== request.amount || result.requestedTerminalId !== request.terminalId ||
      !["-21", "-22"].includes(text(result.code)) || text(parsed.code) !== text(result.code)) return result;
  // The observed reply is JSON. An incomplete/ambiguous raw reply is not proof.
  let raw: Record<string, unknown> | null;
  try { raw = record(JSON.parse(text(result.raw))); } catch { return result; }
  if (!raw || text(raw.code) !== text(parsed.code)) return result;
  const safe = (value: Record<string, unknown>) => Object.entries(value).every(([key, field]) => {
    const name = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
    if (name === "parsed" && value === result) return true;
    // Persisted payloads merge the server's original terminalId metadata with
    // the terminal reply. It is request identity, not the device's terminal.
    if (value === result && name === "terminalid") return text(field) === request.terminalId;
    if (field !== null && typeof field === "object") return false;
    if (["code", "response", "responsecode", "respcode", "resultcode"].includes(name) && text(field) && text(field) !== text(result.code)) return false;
    if ((bankReferenceKeys.has(name) || name === "transactionid") && text(field)) return false;
    if (["status", "result", "success", "succeed", "approved", "transactionstatus", "paymentstatus"].includes(name) &&
        (field === true || ["APPROVED", "SUCCESS", "SUCCEEDED", "SUCCESSFUL", "TRUE"].includes(text(field).toUpperCase()))) return false;
    if (name === "data" && text(field) && text(field) !== request.attemptId) return false;
    // Old signed envelopes do not record the bridge's amount multiplier.
    // Recover only the observed amount-free cancellation; never guess units.
    if (name === "amount" && text(field)) return false;
    if (["terminal", "terminalid"].includes(name) && text(field) && request.terminalId !== "terminal-1" && text(field) !== request.terminalId) return false;
    return true;
  });
  if (![result, parsed, raw].every(safe)) return result;
  const terminals = [result, parsed, raw].flatMap(value => Object.entries(value)
    .filter(([key]) => {
      const name = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
      return ["terminal", "terminalid"].includes(name) && !(value === result && name === "terminalid");
    })
    .map(([, field]) => text(field)).filter(Boolean));
  if (new Set(terminals).size > 1) return result;
  return { ...result, status: "DECLINED", message: text(parsed.desc) || "Terminal payment cancelled" };
}
