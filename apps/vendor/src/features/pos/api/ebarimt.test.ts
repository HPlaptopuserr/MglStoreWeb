import assert from "node:assert/strict";
import test from "node:test";
import type { PosReceipt } from "@mgl/types";
import { issueLocalEbarimtReceipt } from "./ebarimt";

const receipt: PosReceipt = {
  id: "sale-vat",
  receiptNo: "POS-20261111-209609",
  branchName: "Store",
  cashierName: "Cashier",
  paymentMethod: "CARD",
  createdAt: "2026-11-11T10:33:29Z",
  subTotal: 10865,
  grandTotal: 10865,
  taxTotal: 987.72,
  discountTotal: 0,
  lines: [5910, 4955].map((lineTotal, index) => ({
    productId: `product-${index}`,
    name: `Item ${index}`,
    qty: 1,
    unitPrice: lineTotal,
    lineTotal,
    taxAmount: Math.round((lineTotal / 11) * 100) / 100,
    taxType: "VAT_ABLE",
    measureUnit: "pcs",
  })),
};

test("the actual PosAPI request independently calculates item and receipt VAT without changing sale or payments", async () => {
  const previous = globalThis.fetch;
  const original = structuredClone(receipt);
  let posted = 0;
  globalThis.fetch = async (input, init) => {
    if (String(input).endsWith("/rest/info"))
      return Response.json({
        posNo: "10052245",
        merchants: [{ tin: "75200179693", vatPayer: true }],
      });
    assert.equal(init?.method, "POST");
    const payload = JSON.parse(String(init?.body)) as {
      totalAmount: number;
      totalVAT: number;
      billIdSuffix: string;
      receipts: Array<{
        totalVAT: number;
        items: Array<{ totalVAT: number; totalAmount: number }>;
      }>;
      payments: Array<{ paidAmount: number; code: string }>;
    };
    payload.receipts[0].items.forEach((item) => {
      assert.equal(
        item.totalVAT,
        Math.round((item.totalAmount * 100) / 11) / 100,
      );
    });
    posted++;
    assert.equal(payload.totalAmount, 10865);
    assert.equal(payload.totalVAT, 987.73);
    assert.equal(payload.receipts[0].totalVAT, 987.73);
    assert.equal(
      payload.receipts[0].items.reduce(
        (sum, item) => sum + Math.round(item.totalVAT * 100),
        0,
      ),
      98772,
    );
    assert.deepEqual(
      payload.receipts[0].items.map((item) => item.totalAmount),
      [5910, 4955],
    );
    assert.deepEqual(payload.payments, [
      { code: "PAYMENT_CARD", status: "PAID", paidAmount: 10865 },
    ]);
    assert.equal(payload.billIdSuffix, "POS20261111209609");
    return Response.json({
      status: "SUCCESS",
      id: "fiscal-1",
      receipts: [{ id: "sub-1" }],
    });
  };
  try {
    const result = await issueLocalEbarimtReceipt(receipt, []);
    assert.equal(result.billId, "fiscal-1");
    assert.equal(posted, 1);
    assert.deepEqual(receipt, original);
  } finally {
    globalThis.fetch = previous;
  }
});

test("an uncertain receipt POST never falls back to a second transport", async () => {
  const previous = globalThis.fetch;
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousStorage = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: () => null },
  });
  let posted = 0;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {},
  });
  globalThis.fetch = async (input) => {
    if (String(input).includes("/rest/info"))
      return Response.json({
        posNo: "1",
        merchants: [{ tin: "75200179693", vatPayer: true }],
      });
    posted++;
    throw new TypeError("Response lost after PosAPI accepted request");
  };
  try {
    await assert.rejects(
      issueLocalEbarimtReceipt(receipt, []),
      /Response lost/,
    );
    assert.equal(posted, 1);
  } finally {
    globalThis.fetch = previous;
    if (previousWindow)
      Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (previousStorage)
      Object.defineProperty(globalThis, "localStorage", previousStorage);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
