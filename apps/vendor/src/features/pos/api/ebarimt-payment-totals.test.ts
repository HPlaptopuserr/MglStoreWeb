import test from "node:test";
import assert from "node:assert/strict";
import type { PosReceipt, SalePaymentLine } from "@mgl/types";
import { issueLocalEbarimtReceipt } from "./ebarimt";

type FiscalRequest = {
  totalAmount: number;
  totalVAT: number;
  totalCityTax: number;
  type: string;
  customerTin?: string;
  payments: Array<{ code: string; paidAmount: number }>;
  receipts: Array<{
    taxType: string;
    totalAmount: number;
    totalVAT: number;
    items: Array<{
      qty: number;
      unitPrice: number;
      totalAmount: number;
      totalVAT: number;
    }>;
  }>;
};
const sale: PosReceipt = {
  id: "mixed-sale",
  receiptNo: "POS-mixed-sale",
  branchName: "Store",
  cashierName: "Cashier",
  paymentMethod: "MIXED",
  createdAt: "2026-11-20T00:00:00Z",
  subTotal: 1450,
  discountTotal: 100,
  taxTotal: 100,
  grandTotal: 1350,
  lines: [
    {
      productId: "city-tax-item",
      name: "Discounted item",
      qty: 2,
      unitPrice: 610,
      lineTotal: 1120,
      taxAmount: 100,
      cityTaxAmount: 20,
      taxType: "VAT_ABLE",
      measureUnit: "pcs",
    },
    {
      productId: "weight-item",
      name: "Weighted item",
      qty: 0.25,
      unitPrice: 920,
      lineTotal: 230,
      taxAmount: 0,
      taxType: "NOT_VAT",
      measureUnit: "kg",
    },
  ],
};

test("discounted weighted mixed-tax sale preserves all totals, split payments and cash change", async () => {
  const previousFetch = globalThis.fetch;
  let posted: FiscalRequest | undefined;
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith("/rest/info"))
      return Response.json({
        posNo: "pos",
        merchants: [{ tin: "75200179693", vatPayer: true }],
      });
    posted = JSON.parse(String(init?.body)) as FiscalRequest;
    return Response.json({ status: "SUCCESS", id: "fiscal", qrData: "qr" });
  };
  const payments: SalePaymentLine[] = [
    {
      method: "CASH",
      amount: 350,
      cash: { receivedAmount: 500, changeAmount: 150 },
    },
    { method: "CARD", amount: 500, attemptId: "attempt" },
    { method: "QR", amount: 500, invoiceId: "invoice" },
  ];
  const original = structuredClone(sale);
  try {
    await issueLocalEbarimtReceipt(sale, payments, undefined, {
      type: "B2B",
      tin: "12345678901",
    });
    assert.ok(posted);
    assert.equal(posted.totalAmount, 1350);
    assert.equal(
      posted.receipts.reduce((sum, group) => sum + group.totalAmount, 0),
      posted.totalAmount,
    );
    assert.equal(
      posted.payments.reduce((sum, payment) => sum + payment.paidAmount, 0),
      posted.totalAmount,
    );
    assert.deepEqual(posted.payments, [
      { code: "CASH", status: "PAID", paidAmount: 350 },
      { code: "PAYMENT_CARD", status: "PAID", paidAmount: 500 },
      { code: "BANK_TRANSFER_QPAY", status: "PAID", paidAmount: 500 },
    ]);
    assert.equal(posted.totalVAT, 100);
    assert.equal(posted.totalCityTax, 20);
    assert.equal(posted.type, "B2B_RECEIPT");
    assert.equal(posted.customerTin, "12345678901");
    assert.equal(posted.receipts[0].items[0].unitPrice, 560);
    assert.equal(posted.receipts[1].items[0].qty, 0.25);
    assert.equal(posted.receipts[1].items[0].totalVAT, 0);
    assert.deepEqual(sale, original);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("non-VAT merchant issues zero VAT without changing sale amount or cash revenue", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith("/rest/info"))
      return Response.json({
        posNo: "pos",
        merchants: [{ tin: "75200179693", vatPayer: false }],
      });
    const body = JSON.parse(String(init?.body)) as FiscalRequest;
    assert.equal(body.totalAmount, 1350);
    assert.equal(body.totalVAT, 0);
    assert.equal(body.payments[0].paidAmount, 1350);
    assert.ok(body.receipts.every((group) => group.totalVAT === 0));
    return Response.json({ status: "SUCCESS", id: "fiscal", qrData: "qr" });
  };
  try {
    await issueLocalEbarimtReceipt(sale, [
      {
        method: "CASH",
        amount: 1350,
        cash: { receivedAmount: 2000, changeAmount: 650 },
      },
    ]);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("loyalty payment shortfall and inconsistent lines are rejected before fiscal POST", async () => {
  const previousFetch = globalThis.fetch;
  let posts = 0;
  globalThis.fetch = async (url) => {
    if (String(url).endsWith("/rest/info"))
      return Response.json({
        posNo: "pos",
        merchants: [{ tin: "75200179693", vatPayer: true }],
      });
    posts++;
    return Response.json({ status: "SUCCESS" });
  };
  try {
    await assert.rejects(
      issueLocalEbarimtReceipt(sale, [{ method: "CASH", amount: 1250 }]),
      /M Point/,
    );
    await assert.rejects(
      issueLocalEbarimtReceipt({ ...sale, grandTotal: 1400 }, [
        { method: "CASH", amount: 1400 },
      ]),
      /барааны нийлбэр/,
    );
    assert.equal(posts, 0);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("fiscal provider SUCCESS with different totals is never accepted as reconciled", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).endsWith("/rest/info"))
      return Response.json({
        posNo: "pos",
        merchants: [{ tin: "75200179693", vatPayer: true }],
      });
    return Response.json({
      status: "SUCCESS",
      id: "issued",
      totalAmount: 1351,
    });
  };
  try {
    await assert.rejects(
      issueLocalEbarimtReceipt(sale, [{ method: "CASH", amount: 1350 }]),
      /totalAmount/,
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});
