import {
  isMinuTerminalCancellation,
  isMinuInsufficientFunds,
  type MinuTxnResult,
} from "./minu-pos-agent";
import { createHash } from "node:crypto";
import type { CardPaymentAttempt, Prisma } from "@prisma/client";

export type LegacyMinuOutcome =
  | "VERIFIED_APPROVED"
  | "VERIFIED_DECLINED"
  | "UNRESOLVED"
  | "IDENTITY_UNVERIFIED";

/** Historical review is deliberately stricter than the interactive UI parser.
 * Not-found, API errors, age and numeric codes alone never prove cancellation.
 * Agent terminal IDs and returned bank terminal IDs differ in observed responses;
 * invoice + original merchant branch bind the financial result. */
export function classifyLegacyMinuResult(input: {
  invoice: string;
  branchId: string | null;
  result: MinuTxnResult;
}): LegacyMinuOutcome {
  const { invoice, branchId, result } = input;
  const entity = result.entity;
  if (entity?.invoice !== invoice || !branchId || entity.branchId !== branchId)
    return "IDENTITY_UNVERIFIED";
  if (result.apiStatus !== "000") return "UNRESOLVED";
  if (result.approved) return "VERIFIED_APPROVED";
  if (isMinuTerminalCancellation(result.raw) || isMinuInsufficientFunds(result.raw)) return "VERIFIED_DECLINED";
  const explicitRefusals = ["DECLINED", "CANCELLED", "CANCELED", "REJECTED"];
  if (
    result.declined &&
    explicitRefusals.some(
      (value) =>
        value === result.terminalStatus ||
        value ===
          String(entity.error ?? "")
            .trim()
            .toUpperCase(),
    )
  )
    return "VERIFIED_DECLINED";
  return "UNRESOLVED";
}

/** Audit metadata is retained even for ambiguous replies. Only proven results
 * set financial fields; the conditional write cannot replace a newer payment. */
export function planLegacyMinuReview(input: {
  attempt: CardPaymentAttempt;
  result: MinuTxnResult;
  branchId: string;
  runId: string;
  checkedAt: Date;
  applyVerified: boolean;
}): {
  args: Prisma.CardPaymentAttemptUpdateManyArgs;
  statusChanged: boolean;
} | null {
  const { attempt, result, branchId, runId, checkedAt, applyVerified } = input;
  const payload = attempt.providerPayload;
  if (
    attempt.consumedAt ||
    attempt.saleReference ||
    !["PENDING", "FAILED"].includes(attempt.status) ||
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    payload.provider !== "MINU_AGENT" ||
    typeof payload.invoice !== "string" ||
    payload.checkout
  )
    return null;
  const outcome = classifyLegacyMinuResult({
    invoice: payload.invoice,
    branchId,
    result,
  });
  const rrn = String(result.entity?.rrn ?? "").trim();
  const status =
    applyVerified && outcome === "VERIFIED_APPROVED" && rrn
      ? "APPROVED"
      : applyVerified && outcome === "VERIFIED_DECLINED"
        ? "DECLINED"
        : undefined;
  const data: Prisma.CardPaymentAttemptUpdateManyMutationInput = {
    ...(status
      ? {
          status,
          message:
            status === "DECLINED"
              ? result.message || "Картын төлбөр татгалзсан"
              : "Minu payment verified against original invoice",
        }
      : {}),
    ...(status === "APPROVED" ? { transactionId: rrn, traceno: rrn } : {}),
    providerPayload: {
      ...payload,
      legacyMinuReview: {
        runId,
        source: "agent/checkTxn",
        checkedAt: checkedAt.toISOString(),
        outcome,
        apiStatus: result.apiStatus,
        terminalStatus: result.terminalStatus,
        hasRrn: Boolean(rrn),
        invoiceMatches: result.entity?.invoice === payload.invoice,
        branchMatches: result.entity?.branchId === branchId,
        cancelProof: isMinuTerminalCancellation(result.raw),
        terminalReferenceMatches:
          !result.entity?.terminalId ||
          result.entity.terminalId === attempt.terminalId,
        evidenceHash: createHash("sha256")
          .update(JSON.stringify(result.raw))
          .digest("hex"),
      },
    } as Prisma.InputJsonObject,
  };
  return {
    statusChanged: Boolean(status),
    args: {
      where: {
        id: attempt.id,
        organizationId: attempt.organizationId,
        updatedAt: attempt.updatedAt,
        consumedAt: null,
        saleReference: null,
        status: { in: ["PENDING", "FAILED"] },
        providerPayload: { path: ["invoice"], equals: payload.invoice },
      },
      data,
    },
  };
}
