import crypto from "node:crypto";

export function signBridgePayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function readSignedBridgeResult(
  body: unknown,
  signature: unknown,
  secret: string,
): Record<string, unknown> {
  if (
    !secret ||
    typeof body !== "string" ||
    body.length > 256_000 ||
    typeof signature !== "string" ||
    !/^[a-f0-9]{64}$/i.test(signature)
  )
    throw new Error("Signed terminal result is required");
  const expected = Buffer.from(signBridgePayload(body, secret), "hex");
  if (!crypto.timingSafeEqual(Buffer.from(signature, "hex"), expected))
    throw new Error("Terminal result signature mismatch");
  const parsed: unknown = JSON.parse(body);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Invalid terminal result");
  return parsed as Record<string, unknown>;
}
