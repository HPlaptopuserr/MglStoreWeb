import crypto from "node:crypto";

const API_BASE = "https://api.verify.mn";
const DEV_PREFIX = "dev_verify_mn";
interface VerifyOptions {
  allowDevelopmentFallback?: boolean;
  requireCallback?: boolean;
}
export interface VerifyMnSessionResponse {
  sessionId: string;
  phone: string;
  shortcode: string;
  text: string;
  smsUri: string;
  displayInstruction: string;
  expiresAt: string;
}
export interface VerifyMnStatusResponse {
  sessionId: string;
  phone?: string;
  sessionStatus: "PENDING" | "VERIFIED" | "EXPIRED";
  verifiedAt?: string | null;
  expiresAt: string;
}
const canUseFallback = (options: VerifyOptions) =>
  options.allowDevelopmentFallback !== false &&
  process.env.NODE_ENV !== "production" &&
  !process.env.VERIFY_MN_API_KEY;
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Verify.mn хариу буруу байна.");
  return value as Record<string, unknown>;
}
function text(value: Record<string, unknown>, key: string) {
  const field = value[key];
  if (typeof field !== "string" || !field)
    throw new Error("Verify.mn хариу дутуу байна.");
  return field;
}
async function responseBody(response: Response) {
  const value = record(await response.json());
  if (!response.ok)
    throw new Error(
      typeof value.message === "string"
        ? value.message
        : `Verify.mn: ${response.status}`,
    );
  return value;
}
export async function createVerifyMnSession(
  phone: string,
  options: VerifyOptions = {},
): Promise<VerifyMnSessionResponse> {
  const nonce = crypto.randomInt(100000, 1000000).toString();
  const apiKey = process.env.VERIFY_MN_API_KEY;
  if (!apiKey) {
    if (canUseFallback(options))
      return {
        sessionId: `${DEV_PREFIX}:${phone}:${crypto.randomUUID()}`,
        phone,
        shortcode: "LOCAL",
        text: nonce,
        smsUri: `sms:${phone}?body=${nonce}`,
        displayInstruction:
          "Local development fallback. Баталгаажуулах товч дарж үргэлжлүүлнэ үү.",
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      };
    throw new Error("Verify.mn баталгаажуулалтын тохиргоо хийгдээгүй байна.");
  }
  const callback =
    process.env.VERIFY_MN_CALLBACK_URL ||
    (process.env.API_PUBLIC_URL
      ? `${process.env.API_PUBLIC_URL.replace(/\/$/, "")}/auth/web/verify-mn/callback`
      : "");
  if (!callback && options.requireCallback !== false)
    throw new Error("VERIFY_MN_CALLBACK_URL is not configured");
  const data = await responseBody(
    await fetch(`${API_BASE}/sessions`, {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone,
        text: nonce,
        ...(callback ? { callback } : {}),
      }),
    }),
  );
  const shortcode = text(data, "shortcode"),
    smsText = text(data, "text");
  if (
    !/^\d{3,12}$/.test(shortcode) ||
    smsText !== nonce ||
    !Number.isFinite(Date.parse(text(data, "expiresAt")))
  )
    throw new Error("Verify.mn баталгаажуулах мэдээлэл буруу байна.");
  return {
    sessionId: text(data, "sessionId"),
    phone: text(data, "phone"),
    shortcode,
    text: smsText,
    smsUri: `sms:${shortcode}?body=${encodeURIComponent(smsText)}`,
    displayInstruction: text(data, "displayInstruction"),
    expiresAt: text(data, "expiresAt"),
  };
}
export async function getVerifyMnSessionStatus(
  sessionId: string,
  options: VerifyOptions = {},
): Promise<VerifyMnStatusResponse> {
  if (canUseFallback(options) && sessionId.startsWith(`${DEV_PREFIX}:`))
    return {
      sessionId,
      phone: sessionId.split(":")[1],
      sessionStatus: "VERIFIED",
      verifiedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 300000).toISOString(),
    };
  if (!process.env.VERIFY_MN_API_KEY)
    throw new Error("Verify.mn баталгаажуулалтын тохиргоо хийгдээгүй байна.");
  const data = await responseBody(
    await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}`, {
      signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${process.env.VERIFY_MN_API_KEY}` },
    }),
  );
  const sessionStatus = data.sessionStatus;
  if (
    data.sessionId !== sessionId ||
    !["PENDING", "VERIFIED", "EXPIRED"].includes(String(sessionStatus))
  )
    throw new Error("Verify.mn баталгаажуулалтын төлөв буруу байна.");
  return {
    sessionId,
    sessionStatus: sessionStatus as VerifyMnStatusResponse["sessionStatus"],
    phone: typeof data.phone === "string" ? data.phone : undefined,
    verifiedAt: typeof data.verifiedAt === "string" ? data.verifiedAt : null,
    expiresAt: text(data, "expiresAt"),
  };
}
export async function waitForVerifyMnSessionStatus(sessionId: string) {
  let status = await getVerifyMnSessionStatus(sessionId);
  for (
    let attempt = 1;
    attempt < 4 && status.sessionStatus === "PENDING";
    attempt++
  ) {
    await new Promise<void>((resolve) => setTimeout(resolve, 750));
    status = await getVerifyMnSessionStatus(sessionId);
  }
  return status;
}
