import type { QPayInvoice } from "@mgl/types";
import type { CheckoutPaymentEntry } from "../components/PosCheckoutView";

export interface QPayCheckoutScope {
  autoFinalizeEligible?: boolean;
  clientSaleId: string;
  branchId: string;
  shiftId: string;
  lines: Array<{
    productId: string;
    qty: number;
    unitPrice: number;
    priceType?: string;
    discountAmount?: number;
  }>;
}
export type RecoverableQPayInvoice = QPayInvoice & {
  providerCancellationConfirmed?: boolean;
  checkout: QPayCheckoutScope;
};
export type QPayRecoveryPlan = {
  entries: CheckoutPaymentEntry[];
  invoices: RecoverableQPayInvoice[];
};

export function qpayCheckoutFingerprint(scope: QPayCheckoutScope): string {
  return JSON.stringify({
    clientSaleId: scope.clientSaleId,
    branchId: scope.branchId,
    shiftId: scope.shiftId,
    lines: scope.lines
      .map((line) => ({
        productId: line.productId,
        qty: line.qty,
        unitPrice: line.unitPrice,
        priceType: line.priceType || "UNIT",
        discountAmount: line.discountAmount || 0,
      }))
      .sort((a, b) => a.productId.localeCompare(b.productId)),
  });
}

/** Server references restore money only onto the original frozen basket. */
export function planQPayServerRecovery(
  scope: QPayCheckoutScope,
  invoices: RecoverableQPayInvoice[],
  existing: CheckoutPaymentEntry[],
): QPayRecoveryPlan {
  const unresolved = invoices.filter(
    (invoice) =>
      invoice.status === "PAID" ||
      invoice.providerCancellationConfirmed !== true,
  );
  for (const invoice of unresolved) {
    if (
      !invoice.checkout ||
      qpayCheckoutFingerprint(invoice.checkout) !==
        qpayCheckoutFingerprint(scope) ||
      !invoice.invoiceId ||
      !Number.isFinite(invoice.amount) ||
      invoice.amount <= 0 ||
      !["PENDING", "EXPIRED", "PAID"].includes(invoice.status)
    ) {
      throw new Error(
        `Өмнөх QR нэхэмжлэл энэ сагстай зөрүүтэй байна. Шинэ төлбөр эхлээгүй. Тулгаж шалгах лавлах: ${invoice.invoiceId || scope.clientSaleId}`,
      );
    }
  }
  const entries = [...existing];
  for (const invoice of unresolved) {
    const index = entries.findIndex(
      (entry) =>
        entry.invoiceId === invoice.invoiceId || entry.id === invoice.invoiceId,
    );
    const entry: CheckoutPaymentEntry = {
      id: invoice.invoiceId,
      invoiceId: invoice.invoiceId,
      method: "QR",
      amount: invoice.amount,
      status: invoice.status === "PAID" ? "confirmed" : "pending",
    };
    if (index < 0) entries.push(entry);
    else {
      const prior = entries[index];
      if (
        prior.method !== "QR" ||
        Math.round(prior.amount * 100) !== Math.round(invoice.amount * 100)
      )
        throw new Error(
          `QR төлбөрийн дүн зөрүүтэй. Лавлах: ${invoice.invoiceId}`,
        );
      entries[index] = prior.status === "confirmed" ? prior : entry;
    }
  }
  return { entries, invoices: unresolved };
}

const anchorKey = (organizationId: string, registerId: string) =>
  `mglstore.pos.qpay-anchor.v1:${organizationId}:${registerId}`;
export function saveQPayCheckoutAnchor(
  organizationId: string,
  registerId: string,
  scope: QPayCheckoutScope,
  storage: Storage = window.localStorage,
) {
  storage.setItem(anchorKey(organizationId, registerId), JSON.stringify(scope));
}
export function loadQPayCheckoutAnchor(
  organizationId: string,
  registerId: string,
  basket: Omit<QPayCheckoutScope, "clientSaleId">,
  storage: Storage = window.localStorage,
): QPayCheckoutScope | null {
  const raw = storage.getItem(anchorKey(organizationId, registerId));
  if (!raw) return null;
  const parsed: unknown = JSON.parse(raw);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("clientSaleId" in parsed) ||
    typeof parsed.clientSaleId !== "string" ||
    !("lines" in parsed) ||
    !Array.isArray(parsed.lines)
  )
    throw new Error(
      "Өмнөх QR сагсны лавлахыг уншиж чадсангүй. Төлбөрийн мэдээллийг устгаагүй.",
    );
  const saved = parsed as QPayCheckoutScope;
  if (
    qpayCheckoutFingerprint(saved) !==
    qpayCheckoutFingerprint({ ...basket, clientSaleId: saved.clientSaleId })
  )
    throw new Error(
      `Өмнөх QR сагсны лавлах өөр сагсанд хамаарч байна. Шинэ төлбөр эхлээгүй. Лавлах: ${saved.clientSaleId}`,
    );
  return saved;
}
export function clearQPayCheckoutAnchor(
  organizationId: string,
  registerId: string,
  clientSaleId: string,
  storage: Storage = window.localStorage,
) {
  const key = anchorKey(organizationId, registerId);
  const raw = storage.getItem(key);
  if (!raw) return;
  const saved: unknown = JSON.parse(raw);
  if (
    saved &&
    typeof saved === "object" &&
    "clientSaleId" in saved &&
    saved.clientSaleId === clientSaleId
  )
    storage.removeItem(key);
}

export function isDefinitiveQPayCreationFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return (
    ("code" in error && error.code === "PAYMENT_NOT_STARTED") ||
    ("status" in error &&
      [400, 401, 403, 404, 422].includes(Number(error.status)))
  );
}
