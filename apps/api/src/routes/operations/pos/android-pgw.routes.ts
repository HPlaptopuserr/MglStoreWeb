import { Router, type Router as ExpressRouter } from "express";
import {
  prisma,
  AuditAction,
  PosPaymentStatus,
  ShiftStatus,
  PosActivationStatus,
} from "@mgl/database";
import { hasOrgMembership } from "../../../services/permission.service";
import {
  readSignedBridgeResult,
  signBridgePayload,
} from "../../../services/android-pgw-bridge";
import {
  BridgePairingError,
  lockBridgeRegister,
  registerBridgeKey,
} from "../../../services/pos-bridge-keys";
import { requirePosUser } from "./_shared";

const router: ExpressRouter = Router();
type PgwCommand = {
  operation: "void" | "settlement" | "cancel";
  requestId: string;
  terminalId: string;
  rrn?: string;
  attemptId?: string;
};

// This lock also protects pairing/revocation: authorization and reserving a
// pending command must use the same credential generation.
router.post("/pos/payments/android-pgw/command", async (req, res) => {
  const actor = await requirePosUser(req, res);
  if (!actor) return;
  const body = (req.body || {}) as Record<string, unknown>;
  const { registerId, operation, attemptId, shiftId } = body;
  if (
    typeof registerId !== "string" ||
    !["void", "settlement", "cancel"].includes(String(operation))
  )
    return res
      .status(400)
      .json({ message: "Касс болон terminal үйлдэл шаардлагатай" });
  try {
    // Permission reads use the outer client before acquiring the interactive
    // transaction; this also works with a single-connection database pool.
    const scope = await prisma.posRegister.findUnique({
      where: { id: registerId },
      select: { organizationId: true },
    });
    if (!scope)
      throw new BridgePairingError(
        422,
        "Идэвхтэй Android PGW касс шаардлагатай",
      );
    if (
      actor.role !== "ADMIN" &&
      !(await hasOrgMembership(actor.id, scope.organizationId))
    )
      throw new BridgePairingError(
        403,
        "Өөр байгууллагын терминалд хандах боломжгүй",
      );
    const response = await prisma.$transaction(async (tx) => {
      await lockBridgeRegister(tx, registerId);
      const register = await tx.posRegister.findUnique({
        where: { id: registerId },
      });
      if (
        !register ||
        register.deletedAt ||
        !register.isActive ||
        register.activationStatus !== PosActivationStatus.APPROVED ||
        !register.cardEnabled ||
        register.cardProviderType !== "ANDROID_PGW" ||
        !register.terminalBridgeUrl
      )
        throw new BridgePairingError(
          422,
          "Идэвхтэй Android PGW касс шаардлагатай",
        );
      if (register.organizationId !== scope.organizationId)
        throw new BridgePairingError(
          403,
          "Өөр байгууллагын терминалд хандах боломжгүй",
        );

      const key = await registerBridgeKey(registerId, tx);
      if (!key.secret)
        throw new BridgePairingError(
          503,
          "PAX A35-ийг Admin дээрээс холбоно уу",
        );
      const binding = key.bindingId
        ? await tx.posBridgeBinding.findUnique({ where: { id: key.bindingId } })
        : null;
      let command: PgwCommand;
      if (operation === "settlement") {
        if (typeof shiftId !== "string")
          throw new BridgePairingError(400, "Ээлжийн ID шаардлагатай");
        const shift = await tx.posShift.findFirst({
          where: {
            id: shiftId,
            registerId,
            organizationId: register.organizationId,
            status: ShiftStatus.OPEN,
          },
        });
        if (!shift)
          throw new BridgePairingError(
            422,
            "Энэ кассын нээлттэй ээлж олдсонгүй",
          );
        command = {
          operation,
          requestId: `settlement_${shift.id}`,
          terminalId: register.cardTerminalId || "terminal-1",
        };
      } else {
        if (typeof attemptId !== "string")
          throw new BridgePairingError(400, "Картын төлбөрийн ID шаардлагатай");
        const attempt = await tx.cardPaymentAttempt.findFirst({
          where: {
            id: attemptId,
            registerId,
            organizationId: register.organizationId,
          },
        });
        const payload = attempt?.providerPayload as Record<
          string,
          unknown
        > | null;
        if (!attempt || payload?.provider !== "ANDROID_PGW")
          throw new BridgePairingError(422, "Энэ кассын PGW төлбөр олдсонгүй");
        if (operation === "void") {
          if (
            attempt.status !== PosPaymentStatus.APPROVED ||
            !attempt.saleReference
          )
            throw new BridgePairingError(
              422,
              "Борлуулалтад бүртгэгдсэн картын төлбөр шаардлагатай",
            );
          const rrn =
            typeof payload.rrn === "string" ? payload.rrn : attempt.traceno;
          if (!rrn || !/^\d{1,32}$/.test(rrn))
            throw new BridgePairingError(
              422,
              "Банкны RRN олдсонгүй; төлбөрийг тулгана уу",
            );
          command = {
            operation,
            requestId: `void_${attempt.id}`,
            terminalId: attempt.terminalId,
            rrn,
          };
        } else {
          if (attempt.status !== PosPaymentStatus.PENDING)
            throw new BridgePairingError(
              422,
              "Хүлээгдэж буй төлбөр шаардлагатай",
            );
          command = {
            operation: "cancel",
            requestId: `cancel_${attempt.id}`,
            terminalId: attempt.terminalId,
            attemptId: attempt.id,
          };
        }
      }

      // Only authenticated proof of a definitive decline permits a new identity.
      // Approval, uncertainty and browser claims retain the original operation.
      if (body.previousDecline !== undefined) {
        try {
          const proof = body.previousDecline as {
            body?: unknown;
            signature?: unknown;
          };
          const previous = readSignedBridgeResult(
            proof?.body,
            proof?.signature,
            key.secret,
          );
          const prior = previous.command as Record<string, unknown> | undefined;
          const rootId = command.requestId;
          if (
            operation === "cancel" ||
            previous.status !== "DECLINED" ||
            !prior ||
            prior.operation !== command.operation ||
            prior.terminalId !== command.terminalId ||
            prior.rrn !== command.rrn ||
            (prior.requestId !== rootId &&
              (typeof prior.requestId !== "string" ||
                !prior.requestId.startsWith(`${rootId}_`) ||
                !/^[a-f0-9]{12}$/.test(
                  prior.requestId.slice(rootId.length + 1),
                )))
          )
            throw new Error(
              "Only a verified declined operation can be retried",
            );
          command = {
            ...command,
            requestId: `${rootId}_${signBridgePayload(String(proof.body), key.secret).slice(0, 12)}`,
          };
        } catch (error: unknown) {
          throw new BridgePairingError(
            422,
            error instanceof Error ? error.message : "Invalid retry proof",
          );
        }
      }

      if (body.bridgeResponse !== undefined) {
        let result: Record<string, unknown>;
        try {
          result = readSignedBridgeResult(
            body.bridgeResponse,
            body.bridgeSignature,
            key.secret,
          );
          if (JSON.stringify(result.command) !== JSON.stringify(command))
            throw new Error("Terminal command result mismatch");
        } catch (error: unknown) {
          throw new BridgePairingError(
            422,
            error instanceof Error ? error.message : "Invalid terminal result",
          );
        }
        if (
          binding &&
          operation !== "cancel" &&
          ["APPROVED", "DECLINED"].includes(String(result.status))
        ) {
          await tx.posBridgeBinding.updateMany({
            where: {
              id: binding.id,
              activeCommandId: command.requestId,
              revokedAt: null,
            },
            data: { activeCommandId: null },
          });
        }
        // A terminal void does not itself return stock or issue a fiscal return.
        await tx.auditLog.create({
          data: {
            userId: actor.id,
            action: AuditAction.PAYMENT_STATUS_CHANGED,
            ip: req.ip,
            meta: {
              provider: "ANDROID_PGW",
              command,
              status: String(result.status),
              message: String(result.message || ""),
            },
          },
        });
        return {
          succeed: operation !== "cancel" && result.status === "APPROVED",
          message: result.message,
          status: result.status,
          details: result.parsed,
        };
      }

      if (binding && operation !== "cancel") {
        if (
          (binding.activeCommandId &&
            binding.activeCommandId !== command.requestId) ||
          (binding.hasUnresolvedOperation &&
            binding.activeCommandId !== command.requestId)
        )
          throw new BridgePairingError(
            409,
            "Терминалын өмнөх үйлдлийг эхлээд тулгана уу",
          );
        await tx.posBridgeBinding.update({
          where: { id: binding.id },
          data: { activeCommandId: command.requestId },
        });
      }
      return {
        command,
        bridgeUrl: register.terminalBridgeUrl,
        signature: signBridgePayload(JSON.stringify(command), key.secret),
      };
    });
    return res.json(response);
  } catch (error: unknown) {
    if (error instanceof BridgePairingError)
      return res.status(error.status).json({ message: error.message });
    console.error("Android PGW command error", error);
    return res
      .status(500)
      .json({ message: "Терминалын үйлдлийг баталгаажуулж чадсангүй" });
  }
});

export default router;
