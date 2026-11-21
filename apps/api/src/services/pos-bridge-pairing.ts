import crypto from "node:crypto";
import { prisma, type Prisma } from "@mgl/database";
import type { PosBridgeBinding } from "@prisma/client";
import { readSignedBridgeResult } from "./android-pgw-bridge";
import {
  assertBridgeCanChange,
  bridgeRootKey,
  BridgePairingError,
  deriveBridgeSecret,
  hashPairingCode,
  lockBridgeRegister,
} from "./pos-bridge-keys";

export function publicBridgeStatus(
  binding: PosBridgeBinding | null,
  now = new Date(),
) {
  const fresh = Boolean(
    binding?.lastSeenAt &&
    now.getTime() - binding.lastSeenAt.getTime() < 150_000,
  );
  return {
    state: !binding
      ? "UNPAIRED"
      : binding.revokedAt
        ? "REVOKED"
        : !binding.pairedAt
          ? binding.pairingExpiresAt && binding.pairingExpiresAt > now
            ? "PAIRING"
            : "UNPAIRED"
          : fresh && binding.terminalConnected
            ? "CONNECTED"
            : fresh
              ? "TERMINAL_OFFLINE"
              : "OFFLINE",
    pairedAt: binding?.pairedAt?.toISOString() || null,
    lastSeenAt: binding?.lastSeenAt?.toISOString() || null,
    pairingExpiresAt: binding?.pairingExpiresAt?.toISOString() || null,
    serialPath: binding?.serialPath || null,
    terminalId: binding?.terminalId || null,
    bridgeVersion: binding?.bridgeVersion || null,
    lastError: binding?.lastError || null,
    hasUnresolvedOperation: Boolean(
      binding?.hasUnresolvedOperation || binding?.activeCommandId,
    ),
  };
}

async function eligibleRegister(
  tx: Prisma.TransactionClient,
  registerId: string,
) {
  const register = await tx.posRegister.findUnique({
    where: { id: registerId },
  });
  if (
    !register ||
    register.deletedAt ||
    !register.isActive ||
    register.activationStatus !== "APPROVED" ||
    register.mode !== "RETAIL"
  )
    throw new BridgePairingError(
      422,
      "Идэвхтэй, батлагдсан Vendor дэлгүүрийн касс сонгоно уу",
    );
  return register;
}

export async function issueBridgePairing(registerId: string, actorId: string) {
  bridgeRootKey();
  const code = crypto
    .randomBytes(10)
    .toString("hex")
    .toUpperCase()
    .match(/.{5}/g)!
    .join("-");
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  await prisma.$transaction(async (tx) => {
    await lockBridgeRegister(tx, registerId);
    await eligibleRegister(tx, registerId);
    await assertBridgeCanChange(tx, registerId);
    await tx.posBridgeBinding.upsert({
      where: { registerId },
      create: {
        registerId,
        pairingCodeHash: hashPairingCode(code),
        pairingExpiresAt: expiresAt,
      },
      update: {
        pairingCodeHash: hashPairingCode(code),
        pairingExpiresAt: expiresAt,
      },
    });
    await tx.posRegister.update({
      where: { id: registerId },
      data: {
        cardEnabled: true,
        cardProviderType: "ANDROID_PGW",
        cardTerminalId: null,
        terminalBridgeUrl: "http://127.0.0.1:7420",
      },
    });
    await tx.auditLog.create({
      data: {
        userId: actorId,
        action: "POS_REGISTER_UPDATED",
        meta: { registerId, operation: "BRIDGE_PAIRING_ISSUED" },
      },
    });
  });
  return { code, expiresAt: expiresAt.toISOString() };
}

export async function claimBridgePairing(code: string, deviceId: string) {
  if (
    !/^[A-F0-9]{20}$/.test(code.replace(/-/g, "").trim().toUpperCase()) ||
    !/^[A-Za-z0-9_-]{16,128}$/.test(deviceId)
  )
    throw new BridgePairingError(
      400,
      "Холбох код эсвэл төхөөрөмжийн ID буруу байна",
    );
  const codeHash = hashPairingCode(code);
  const candidate = await prisma.posBridgeBinding.findUnique({
    where: { pairingCodeHash: codeHash },
  });
  if (!candidate)
    throw new BridgePairingError(
      410,
      "Код хүчингүй, ашиглагдсан эсвэл хугацаа дууссан байна",
    );
  return prisma.$transaction(async (tx) => {
    await lockBridgeRegister(tx, candidate.registerId);
    const register = await eligibleRegister(tx, candidate.registerId);
    if (!register.cardEnabled || register.cardProviderType !== "ANDROID_PGW")
      throw new BridgePairingError(
        409,
        "Кассын картын тохиргоо өөрчлөгдсөн байна",
      );
    await assertBridgeCanChange(tx, candidate.registerId);
    const salt = crypto.randomBytes(32).toString("hex");
    const now = new Date();
    const claimed = await tx.posBridgeBinding.updateMany({
      where: {
        id: candidate.id,
        pairingCodeHash: codeHash,
        pairingExpiresAt: { gt: now },
      },
      data: {
        pairingCodeHash: null,
        pairingExpiresAt: null,
        credentialSalt: salt,
        deviceId,
        pairedAt: now,
        revokedAt: null,
        lastSeenAt: null,
        lastHeartbeatAt: null,
        terminalConnected: false,
        terminalId: null,
        serialPath: null,
        bridgeVersion: null,
        lastError: null,
      },
    });
    if (claimed.count !== 1)
      throw new BridgePairingError(
        410,
        "Код хүчингүй, ашиглагдсан эсвэл хугацаа дууссан байна",
      );
    await tx.auditLog.create({
      data: {
        action: "POS_REGISTER_UPDATED",
        meta: {
          registerId: register.id,
          operation: "BRIDGE_PAIRED",
          bindingId: candidate.id,
        },
      },
    });
    return {
      bindingId: candidate.id,
      registerId: register.id,
      deviceId,
      secret: deriveBridgeSecret(register.id, salt, bridgeRootKey()),
    };
  });
}

export async function revokeBridgePairing(registerId: string, actorId: string) {
  await prisma.$transaction(async (tx) => {
    await lockBridgeRegister(tx, registerId);
    await assertBridgeCanChange(tx, registerId);
    await tx.posBridgeBinding.updateMany({
      where: { registerId },
      data: {
        revokedAt: new Date(),
        credentialSalt: null,
        pairingCodeHash: null,
        pairingExpiresAt: null,
        terminalConnected: false,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: actorId,
        action: "POS_REGISTER_UPDATED",
        meta: { registerId, operation: "BRIDGE_REVOKED" },
      },
    });
  });
}

export async function recordBridgeHeartbeat(body: string, signature: string) {
  let hint: unknown;
  try {
    hint = JSON.parse(body);
  } catch {
    throw new BridgePairingError(400, "Invalid heartbeat");
  }
  if (
    !hint ||
    typeof hint !== "object" ||
    !("bindingId" in hint) ||
    typeof hint.bindingId !== "string"
  )
    throw new BridgePairingError(400, "Invalid heartbeat");
  const candidate = await prisma.posBridgeBinding.findUnique({
    where: { id: hint.bindingId },
    select: { registerId: true },
  });
  if (!candidate)
    throw new BridgePairingError(401, "Bridge холбоос хүчингүй байна");
  await prisma.$transaction(async (tx) => {
    await lockBridgeRegister(tx, candidate.registerId);
    const binding = await tx.posBridgeBinding.findUnique({
      where: { registerId: candidate.registerId },
      include: { register: true },
    });
    if (
      !binding ||
      !binding.credentialSalt ||
      binding.revokedAt ||
      binding.register.deletedAt ||
      !binding.register.isActive ||
      !binding.register.cardEnabled ||
      binding.register.cardProviderType !== "ANDROID_PGW"
    )
      throw new BridgePairingError(401, "Bridge холбоос хүчингүй байна");
    let data: Record<string, unknown>;
    try {
      data = readSignedBridgeResult(
        body,
        signature,
        deriveBridgeSecret(
          binding.registerId,
          binding.credentialSalt,
          bridgeRootKey(),
        ),
      );
    } catch {
      throw new BridgePairingError(401, "Invalid bridge signature");
    }
    const timestamp = Number(data.timestamp);
    if (
      data.deviceId !== binding.deviceId ||
      !Number.isFinite(timestamp) ||
      Math.abs(Date.now() - timestamp) > 120_000 ||
      typeof data.terminalConnected !== "boolean" ||
      typeof data.hasUnresolvedOperation !== "boolean"
    )
      throw new BridgePairingError(400, "Invalid heartbeat data or timestamp");
    const text = (value: unknown, max: number) =>
      typeof value === "string" ? value.slice(0, max) : null;
    const updated = await tx.posBridgeBinding.updateMany({
      where: {
        id: binding.id,
        credentialSalt: binding.credentialSalt,
        revokedAt: null,
        OR: [
          { lastHeartbeatAt: null },
          { lastHeartbeatAt: { lt: new Date(timestamp) } },
        ],
      },
      data: {
        lastSeenAt: new Date(),
        lastHeartbeatAt: new Date(timestamp),
        terminalConnected: data.terminalConnected,
        serialPath: text(data.serialPath, 128),
        terminalId: text(data.terminalId, 64),
        bridgeVersion: text(data.bridgeVersion, 32),
        lastError: text(data.error, 300),
        hasUnresolvedOperation: data.hasUnresolvedOperation,
      },
    });
    if (!updated.count) throw new BridgePairingError(409, "Stale heartbeat");
  });
}
