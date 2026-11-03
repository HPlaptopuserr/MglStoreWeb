import type { PosReceipt } from "../types/receipt.types";
import type { SalePayload, SalePaymentMethod } from "../types/pos.types";
import {
  assertNonEmptyString,
  sanitizeReceiptNote,
} from "../utils/pos-security";
import { posRequest } from "./_pos-client";

export function createSale(payload: SalePayload): Promise<PosReceipt> {
  const shiftId = payload.shiftId?.trim() || "";

  const safeBreakdown = payload.paymentBreakdown?.map((line) => ({
    method: assertNonEmptyString(
      line.method,
      "paymentBreakdown.method",
    ) as SalePaymentMethod,
    amount: Number(line.amount) || 0,
    attemptId: line.attemptId,
    transactionId: line.transactionId,
    invoiceId: line.invoiceId,
    credit: line.credit,
    cash: line.cash,
  }));

  const safePayload: SalePayload = {
    ...payload,
    shiftId,
    branchId: assertNonEmptyString(payload.branchId, "branchId"),
    registerId: payload.registerId,
    organizationId: payload.organizationId,
    clientSaleId: assertNonEmptyString(
      payload.clientSaleId || "",
      "clientSaleId",
    ),
    paymentMethod: assertNonEmptyString(payload.paymentMethod, "paymentMethod"),
    paymentBreakdown: safeBreakdown,
    loyalty: payload.loyalty
      ? {
          mode: payload.loyalty.mode,
          phone: payload.loyalty.phone?.replace(/\D/g, ""),
          redeemPoints: Math.max(
            0,
            Math.floor(Number(payload.loyalty.redeemPoints || 0)),
          ),
          redeemSessionId: payload.loyalty.redeemSessionId,
        }
      : undefined,
    note: sanitizeReceiptNote(payload.note),
    lines: payload.lines.map((line) => ({
      ...line,
      productId: assertNonEmptyString(line.productId, "productId"),
    })),
  };

  return posRequest<PosReceipt>("/pos/sales", {
    method: "POST",
    body: safePayload,
  });
}
