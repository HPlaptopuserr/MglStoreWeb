import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { prisma, type Prisma } from "@mgl/database";
import { recordPosQrProviderResponse } from "./pos-qr-provider-response";
const restore: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restore.push(() => {
    Reflect.set(target, key, previous);
  });
}
afterEach(() => {
  while (restore.length) restore.pop()?.();
});
test("a delayed QR creation response preserves archived cancellation and callback evidence", async () => {
  let locked = false;
  let updated: Prisma.QPayInvoiceUpdateArgs | undefined;
  stub(
    prisma,
    "$transaction",
    async (run: (tx: typeof prisma) => Promise<unknown>) => run(prisma),
  );
  stub(prisma, "$queryRaw", async () => {
    locked = true;
    return [];
  });
  stub(prisma.qPayInvoice, "findUniqueOrThrow", async () => {
    assert.equal(locked, true);
    return {
      status: "EXPIRED",
      webhookPayload: {
        reviewArchiveId: "archive",
        checkoutAbandonedAt: "timestamp",
        providerCancellationConfirmed: false,
        requiresPaymentReconciliation: true,
        paidEvidence: "callback",
      },
    };
  });
  stub(
    prisma.qPayInvoice,
    "update",
    async (args: Prisma.QPayInvoiceUpdateArgs) => {
      updated = args;
      return args;
    },
  );
  await recordPosQrProviderResponse({
    invoiceId: "invoice",
    qrText: "late-qr",
    metadata: { provider: "SYSTEMQR", providerInvoiceId: "provider-id" },
  });
  assert.ok(updated);
  assert.equal(updated.data.status, undefined);
  assert.equal(updated.data.paidAt, undefined);
  assert.deepEqual(updated.data.webhookPayload, {
    reviewArchiveId: "archive",
    checkoutAbandonedAt: "timestamp",
    providerCancellationConfirmed: false,
    requiresPaymentReconciliation: true,
    paidEvidence: "callback",
    provider: "SYSTEMQR",
    providerInvoiceId: "provider-id",
  });
});
