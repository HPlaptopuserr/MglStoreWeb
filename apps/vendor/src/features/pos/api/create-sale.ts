import type { PosReceipt } from "../types/receipt.types";
import type { SalePayload, SalePaymentMethod } from "../types/pos.types";
import { assertNonEmptyString, sanitizeReceiptNote } from "../utils/pos-security";
import { PosApiError, posRequest } from "./_pos-client";

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
  }));

  const safePayload: SalePayload = {
    ...payload,
    shiftId,
    branchId: assertNonEmptyString(payload.branchId, "branchId"),
    registerId: payload.registerId,
    organizationId: payload.organizationId,
    clientSaleId: assertNonEmptyString(payload.clientSaleId || "", "clientSaleId"),
    paymentMethod: assertNonEmptyString(payload.paymentMethod, "paymentMethod"),
    paymentBreakdown: safeBreakdown,
    note: sanitizeReceiptNote(payload.note),
    lines: payload.lines.map((line) => ({
      ...line,
      productId: assertNonEmptyString(line.productId, "productId"),
    })),
  };

  return posRequest<PosReceipt>("/pos/sales", {
    method: "POST",
    body: safePayload,
  }).catch((error) => {
    // Local dev/demo fallback: backend may not expose /pos/sales yet.
    if (error instanceof PosApiError && error.status === 404) {
      return buildMockReceipt(safePayload);
    }
    throw error;
  });
}

function buildMockReceipt(payload: SalePayload): PosReceipt {
  const now = new Date().toISOString();
  const lines = payload.lines.map((line) => {
    const lineSubTotal = line.qty * line.unitPrice;
    const lineDiscount = line.discountAmount * line.qty;
    const taxable = Math.max(0, lineSubTotal - lineDiscount);
    const taxAmount = taxable * ((line.taxRate || 0) / 100);
    return {
      productId: line.productId,
      name: `Product ${line.productId.slice(0, 6)}`,
      qty: line.qty,
      unitPrice: line.unitPrice,
      taxAmount,
      lineTotal: taxable + taxAmount,
    };
  });

  const subTotal = lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0);
  const taxTotal = lines.reduce((sum, line) => sum + line.taxAmount, 0);
  const discountTotal = payload.lines.reduce(
    (sum, line) => sum + line.discountAmount * line.qty,
    0,
  );
  const grandTotal = subTotal + taxTotal - discountTotal;

  return {
    id: `local-${Date.now()}`,
    receiptNo: `RCPT-${Math.floor(Date.now() / 1000)}`,
    branchName: payload.branchId,
    cashierName: "Vendor Cashier",
    paymentMethod: payload.paymentMethod,
    paymentBreakdown: payload.paymentBreakdown?.map((item) => ({
      method: item.method,
      amount: item.amount,
      transactionId: item.transactionId,
      invoiceId: item.invoiceId,
    })),
    createdAt: now,
    lines,
    subTotal,
    taxTotal,
    discountTotal,
    grandTotal,
  };
}
