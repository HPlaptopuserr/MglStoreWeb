import assert from "node:assert/strict";
import test from "node:test";
import type {
  CheckoutPaymentEntry,
  CheckoutQPayInvoice,
} from "../components/PosCheckoutView";
import { missingQrCancellationTarget } from "./missing-qr-cancellation";
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
