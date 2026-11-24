import crypto from "node:crypto";
import { prisma, type Prisma } from "@mgl/database";

export class BridgePairingError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function deriveBridgeSecret(
  registerId: string,
  salt: string,
  rootKey: string,
): string {
  return crypto
    .createHmac("sha256", rootKey)
    .update(`mgl:pos-bridge:v1:${registerId}:${salt}`)
    .digest("hex");
}

const DEDICATED_SALT_PREFIX = "v2:";
const PLACEHOLDER_KEYS = new Set([
  "dev-secret-change-me",
  "replace-with-a-long-random-secret",
  "replace-with-the-api-shared-secret",
  "your-secret-key-at-least-32-characters-long",
]);

const dedicatedRoot = () =>
  String(process.env.POS_BRIDGE_PAIRING_SECRET || "").trim();

/** Stored salts select their original root; adding an env key never rotates devices. */
export function bridgeRootKey(credentialSalt?: string): string {
  const dedicated = dedicatedRoot();
  const useDedicated =
    credentialSalt === undefined
      ? Boolean(dedicated)
      : credentialSalt.startsWith(DEDICATED_SALT_PREFIX);
  if (
    credentialSalt !== undefined &&
    /^v\d+:/.test(credentialSalt) &&
    !useDedicated
  )
    throw new BridgePairingError(
      503,
      "Bridge түлхүүрийн хувилбар дэмжигдэхгүй байна",
    );
  if (useDedicated) {
    if (dedicated.length < 32 || PLACEHOLDER_KEYS.has(dedicated.toLowerCase()))
      throw new BridgePairingError(
        503,
        "PAX холболтын серверийн түлхүүр тохируулагдаагүй байна",
      );
    return dedicated;
  }
  const key = process.env.JWT_SECRET || "dev-secret-change-me";
  const environment = process.env.APP_ENV || process.env.NODE_ENV;
  if (
    ["production", "staging"].includes(environment || "") &&
    (key.length < 32 || PLACEHOLDER_KEYS.has(key.toLowerCase()))
  )
    throw new BridgePairingError(
      503,
      "PAX холболтын серверийн түлхүүр тохируулагдаагүй байна",
    );
  return key;
}

export function createBridgeCredentialSalt(): string {
  // Validate before consuming a pairing code or changing its stored generation.
  bridgeRootKey();
  return `${dedicatedRoot() ? DEDICATED_SALT_PREFIX : ""}${crypto.randomBytes(32).toString("hex")}`;
}

export function hashPairingCode(raw: string): string {
  return crypto
    .createHash("sha256")
    .update(raw.replace(/-/g, "").trim().toUpperCase())
    .digest("hex");
}

type Database = Pick<Prisma.TransactionClient, "posBridgeBinding">;
export async function registerBridgeKey(
  registerId: string,
  db: Database = prisma,
) {
  const binding = await db.posBridgeBinding.findUnique({
    where: { registerId },
  });
  if (!binding)
    return {
      secret: String(process.env.POS_BRIDGE_SHARED_SECRET || "").trim(),
      bindingId: null,
    };
  if (!binding.credentialSalt || binding.revokedAt)
    throw new BridgePairingError(
      409,
      "PAX A35-ийг Admin-ийн нэг удаагийн кодоор холбоно уу",
    );
  return {
    secret: deriveBridgeSecret(
      registerId,
      binding.credentialSalt,
      bridgeRootKey(binding.credentialSalt),
    ),
    bindingId: binding.id,
  };
}

export async function attemptBridgeKey(attempt: {
  registerId?: string | null;
  providerPayload?: unknown;
}): Promise<string> {
  const payload = attempt.providerPayload as Record<string, unknown> | null;
  if (!payload?.bridgeBindingId)
    return String(process.env.POS_BRIDGE_SHARED_SECRET || "").trim();
  if (!attempt.registerId)
    throw new BridgePairingError(409, "Кассын холбоос олдсонгүй");
  const key = await registerBridgeKey(attempt.registerId);
  if (key.bindingId !== payload.bridgeBindingId)
    throw new BridgePairingError(409, "Терминалын холбоос өөрчлөгдсөн байна");
  return key.secret;
}

export async function lockBridgeRegister(
  tx: Prisma.TransactionClient,
  registerId: string,
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`pgw-register:${registerId}`}, 0))`;
}

export async function assertBridgeCanChange(
  tx: Prisma.TransactionClient,
  registerId: string,
) {
  const binding = await tx.posBridgeBinding.findUnique({
    where: { registerId },
  });
  if (binding?.activeCommandId || binding?.hasUnresolvedOperation)
    throw new BridgePairingError(
      409,
      "Терминалын шийдэгдээгүй үйлдлийг эхлээд тулгана уу",
    );
  const pending = await tx.cardPaymentAttempt.findFirst({
    where: {
      registerId,
      consumedAt: null,
      status: { in: ["PENDING", "FAILED"] },
    },
    select: { id: true },
  });
  if (pending)
    throw new BridgePairingError(
      409,
      "Хүлээгдэж буй картын төлбөрийг эхлээд шийдвэрлэнэ үү",
    );
}
