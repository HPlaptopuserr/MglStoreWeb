import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
const developmentSecret = randomBytes(32).toString("hex");
export interface RecoveryChallenge {
  phone: string;
  sessionId: string;
  expiresAt: number;
}
function secret(): string {
  const value = process.env.BUSINESS_PASSWORD_SECRET;
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV !== "production") return developmentSecret;
  throw new Error("Password recovery is not configured");
}
export function signChallenge(challenge: RecoveryChallenge): string {
  const payload = Buffer.from(JSON.stringify(challenge)).toString("base64url");
  return `${payload}.${createHmac("sha256", secret()).update(payload).digest("base64url")}`;
}
export function readChallenge(
  value: string | undefined,
): RecoveryChallenge | null {
  if (!value) return null;
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest();
  const supplied = Buffer.from(signature, "base64url");
  if (
    expected.length !== supplied.length ||
    !timingSafeEqual(expected, supplied)
  )
    return null;
  try {
    const data: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    );
    if (
      typeof data !== "object" ||
      data === null ||
      !("phone" in data) ||
      typeof data.phone !== "string" ||
      !("sessionId" in data) ||
      typeof data.sessionId !== "string" ||
      !("expiresAt" in data) ||
      typeof data.expiresAt !== "number" ||
      data.expiresAt <= Date.now()
    )
      return null;
    return {
      phone: data.phone,
      sessionId: data.sessionId,
      expiresAt: data.expiresAt,
    };
  } catch {
    return null;
  }
}
