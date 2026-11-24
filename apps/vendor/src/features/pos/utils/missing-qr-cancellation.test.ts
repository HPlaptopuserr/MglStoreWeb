import assert from "node:assert/strict";
import test from "node:test";
import type {
  CheckoutPaymentEntry,
  CheckoutQPayInvoice,
} from "../components/PosCheckoutView";
import { missingQrCancellationTarget, resolveMissingQrCancellationTarget } from "./missing-qr-cancellation";
const entry: CheckoutPaymentEntry = {
  id: "entry",
  method: "QR",
  status: "pending",
  amount: 2040,
  invoiceId: "invoice",
};
const invoice: CheckoutQPayInvoice = {
  open: true,
  invoiceId: "invoice",
  amount: 2040,
  qrText: "",
  qrImage: "",
  expiresAt: "2026-11-24T08:00:00Z",
};
test("only a single pending QR without a rendered bank response uses immediate request cancellation", () => {
  assert.equal(missingQrCancellationTarget([entry], invoice, false), "invoice");
  assert.equal(missingQrCancellationTarget([entry], invoice, true), null);
  assert.equal(
    missingQrCancellationTarget(
      [entry],
      { ...invoice, qrText: "bank-qr" },
      false,
    ),
    null,
  );
  assert.equal(
    missingQrCancellationTarget(
      [entry],
      { ...invoice, qrImage: "bank-image" },
      false,
    ),
    null,
  );
  assert.equal(
    missingQrCancellationTarget(
      [entry],
      { ...invoice, invoiceId: "another" },
      false,
    ),
    null,
  );
  assert.equal(
    missingQrCancellationTarget(
      [{ ...entry, status: "confirmed" }],
      invoice,
      false,
    ),
    null,
  );
  assert.equal(
    missingQrCancellationTarget(
      [entry, { ...entry, id: "second" }],
      invoice,
      false,
    ),
    null,
  );
  assert.equal(missingQrCancellationTarget([entry], null, false), null);
});


test("a dismissed panel uses the stored invoice to cancel an incomplete QR request", async () => {
  let reads = 0;
  const read = async (id: string) => {
    reads++;
    assert.equal(id, entry.invoiceId);
    return { ...invoice, status: "PENDING" };
  };
  assert.equal(await resolveMissingQrCancellationTarget([entry], null, false, read), "invoice");
  assert.equal(reads, 1);
  assert.equal(await resolveMissingQrCancellationTarget([entry], invoice, false, read), "invoice");
  assert.equal(await resolveMissingQrCancellationTarget([entry], null, true, read), null);
  assert.equal(await resolveMissingQrCancellationTarget([{ ...entry, status: "confirmed" }], null, false, read), null);
  assert.equal(await resolveMissingQrCancellationTarget([entry, entry], null, false, read), null);
  assert.equal(reads, 1);
});

test("a hidden panel cannot conceal a created or paid QR, mismatched invoice, or failed read", async () => {
  for (const stored of [
    { ...invoice, status: "PENDING", qrText: "real-qr" },
    { ...invoice, status: "PENDING", qrImage: "real-image" },
    { ...invoice, status: "PAID" },
    { ...invoice, status: "PENDING", invoiceId: "another" },
  ]) {
    assert.equal(await resolveMissingQrCancellationTarget([entry], null, false, async () => stored), null);
  }
  await assert.rejects(resolveMissingQrCancellationTarget([entry], null, false,
    async () => { throw new Error("offline"); }), /offline/);
});
