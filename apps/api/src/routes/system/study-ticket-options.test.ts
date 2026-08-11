import assert from "node:assert/strict";
import test from "node:test";
import {
  getStudyInvoiceExpectedPrice,
  normalizeStudyTicketOptions,
  resolveStudyTicketSelection,
} from "./study-ticket-options";

test("study ticket options are cleaned and limited", () => {
  const options = normalizeStudyTicketOptions([
    { id: " single ", label: " Single ", price: "50000.4" },
    { label: "Double", price: 90000 },
    { id: "empty", label: "", price: 10 },
  ]);

  assert.deepEqual(options, [
    { id: "single", label: "Single", price: 50000 },
    { id: "ticket-2", label: "Double", price: 90000 },
  ]);
});

test("explicit study ticket controls the payment amount", () => {
  const options = normalizeStudyTicketOptions([
    { id: "single", label: "Single", price: 50000 },
    { id: "double", label: "Double", price: 90000 },
  ]);

  const selected = resolveStudyTicketSelection({
    options,
    requestedId: "double",
    fallbackPrice: 50000,
  });

  assert.equal(selected.invalid, false);
  assert.equal(selected.option?.label, "Double");
  assert.equal(selected.amount, 90000);
});

test("unknown ticket ids fail instead of falling back to another price", () => {
  const selected = resolveStudyTicketSelection({
    options: [{ id: "single", label: "Single", price: 50000 }],
    requestedId: "vip",
    fallbackPrice: 50000,
  });

  assert.equal(selected.invalid, true);
  assert.equal(selected.option, undefined);
});

test("invoice validation uses the server-recorded study ticket price", () => {
  assert.equal(
    getStudyInvoiceExpectedPrice(
      {
        source: "STUDY",
        ticketOptionId: "double",
        ticketPrice: 90000,
      },
      50000,
    ),
    90000,
  );
  assert.equal(getStudyInvoiceExpectedPrice({}, 50000), 50000);
});
