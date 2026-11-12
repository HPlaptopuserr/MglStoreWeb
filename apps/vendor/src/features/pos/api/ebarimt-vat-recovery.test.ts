import assert from "node:assert/strict";
import { beforeEach, afterEach, test } from "node:test";
import { recoverVatReceipts } from "./ebarimt-vat-recovery";
import { buildVatRecoveryPayload } from "../utils/ebarimt-vat-recovery";
import type { RegisterConfig } from "../types/pos.types";

const originalId = "075200179693001098050017110052245";
const source = {
  id: originalId,
  status: "ERROR",
  type: "B2C_RECEIPT",
  merchantTin: "75200179693",
  posNo: "10052245",
  totalAmount: 10865,
  totalCityTax: 0,
  branchNo: "001",
  districtCode: "0101",
  receipts: [
    {
      taxType: "VAT_ABLE",
      totalCityTax: 0,
      items: [5910, 4955].map((totalAmount) => ({
        name: "Item",
        barCode: "1234567890123",
        barCodeType: "UNDEFINED",
        classificationCode: "6212991",
        measureUnit: "pcs",
        qty: 1,
        unitPrice: totalAmount,
        totalAmount,
        totalCityTax: 0,
      })),
    },
  ],
  payments: [{ code: "PAYMENT_CARD", status: "PAID", paidAmount: 10865 }],
};
const register: RegisterConfig = {
  id: "d453a52d-dbb0-472d-8220-b01fd11d22fc",
  mode: "RETAIL",
  name: "Cashier",
  label: null,
  cardEnabled: false,
  cardProviderType: null,
  cardTerminalId: null,
  terminalBridgeUrl: null,
  qpayEnabled: false,
  effectiveQpayEnabled: false,
  qpayMerchantId: null,
  qpayTerminalId: null,
  ebarimtEnabled: true,
  ebarimtPosApiUrl: "http://localhost:7080",
  ebarimtMerchantTin: "75200179693",
  ebarimtPosNo: "10052245",
  ebarimtMerchantName: null,
  isActive: true,
  branchId: "branch",
  organizationId: "org",
  branch: { id: "branch", name: "Store" },
};
let state: "READY" | "SUBMITTED" | "COMPLETED";
let issuances: number;
let starts: number;
let completeFails: boolean;
let responseLost: boolean;
let invalidPresent: boolean;
let diagnostics: Array<Record<string, unknown>>;
let storage: Map<string, string>;
let previousFetch: typeof globalThis.fetch;
let previousWindow: PropertyDescriptor | undefined;
let previousStorage: PropertyDescriptor | undefined;
beforeEach(() => {
  diagnostics = [];
  state = "READY";
  issuances = 0;
  starts = 0;
  completeFails = false;
  responseLost = false;
  invalidPresent = true;
  storage = new Map();
  previousFetch = globalThis.fetch;
  previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  previousStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {},
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/pos/ebarimt-vat-recovery-diagnostics")) {
      diagnostics.push(
        JSON.parse(String(init?.body)) as Record<string, unknown>,
      );
      return Response.json({ recorded: true });
    }
    if (url.includes("/rest/info"))
      return Response.json({
        posNo: "10052245",
        merchants: [{ tin: "75200179693", vatPayer: true }],
      });
    if (url.includes("/rest/receipt/invalid/list"))
      return Response.json(invalidPresent ? [{ id: originalId }] : []);
    if (url.includes("/pos/ebarimt-vat-recovery") && init?.method === "GET")
      return Response.json({
        total: 25,
        receipts: [
          {
            saleId: "sale",
            receiptNo: "POS-20261111-209609",
            originalId,
            totalAmount: 10865,
            state,
          },
        ],
      });
    if (url.includes("/pos/ebarimt-vat-recovery/sale")) {
      const body = JSON.parse(String(init?.body)) as { action: string };
      if (body.action === "START") {
        starts++;
        state = "SUBMITTED";
        return Response.json({ source });
      }
      if (completeFails)
        return Response.json({ message: "Save unavailable" }, { status: 500 });
      state = "COMPLETED";
      return Response.json({ state });
    }
    if (url.endsWith("/rest/receipt")) {
      issuances++;
      const payload = JSON.parse(String(init?.body)) as {
        inactiveId: string;
        totalAmount: number;
        totalVAT: number;
        payments: unknown;
      };
      assert.equal(payload.inactiveId, originalId);
      assert.equal(payload.totalAmount, 10865);
      assert.equal(payload.totalVAT, 987.73);
      assert.deepEqual(payload.payments, source.payments);
      if (responseLost) throw new TypeError("Response lost");
      return Response.json({
        status: "SUCCESS",
        id: "075200179693001098059999910052245",
        merchantTin: "75200179693",
        posNo: "10052245",
        totalAmount: 10865,
        totalVAT: 987.73,
        date: "2026-11-11 19:00:00",
      });
    }
    throw new Error(`Unexpected endpoint: ${url}`);
  };
});
afterEach(() => {
  globalThis.fetch = previousFetch;
  if (previousWindow)
    Object.defineProperty(globalThis, "window", previousWindow);
  else Reflect.deleteProperty(globalThis, "window");
  if (previousStorage)
    Object.defineProperty(globalThis, "localStorage", previousStorage);
  else Reflect.deleteProperty(globalThis, "localStorage");
});

test("recovery corrects the original fiscal ID and never calls stock, payment or sale creation endpoints", async () => {
  const result = await recoverVatReceipts(
    register,
    () => true,
    () => {},
  );
  assert.equal(result.receipts[0].state, "COMPLETED");
  assert.equal(issuances, 1);
  assert.equal(starts, 1);
  await recoverVatReceipts(
    register,
    () => true,
    () => {},
  );
  assert.equal(issuances, 1);
});
test("a lost attachment is resumed from saved success without another fiscal request", async () => {
  completeFails = true;
  await assert.rejects(
    recoverVatReceipts(
      register,
      () => true,
      () => {},
    ),
    /Save unavailable/,
  );
  assert.equal(issuances, 1);
  completeFails = false;
  await recoverVatReceipts(
    register,
    () => true,
    () => {},
  );
  assert.equal(state, "COMPLETED");
  assert.equal(issuances, 1);
  assert.equal(starts, 1);
});
test("an uncertain fiscal response is reserved and never blindly retried", async () => {
  responseLost = true;
  await assert.rejects(
    recoverVatReceipts(
      register,
      () => true,
      () => {},
    ),
    /Response lost/,
  );
  await recoverVatReceipts(
    register,
    () => true,
    () => {},
  );
  assert.equal(issuances, 1);
  assert.equal(starts, 1);
  assert.equal(state, "SUBMITTED");
});
test("unconfirmed originals, active checkout and unavailable browser storage stop before issuance", async () => {
  invalidPresent = false;
  await recoverVatReceipts(
    register,
    () => true,
    () => {},
  );
  assert.equal(starts, 0);
  invalidPresent = true;
  await recoverVatReceipts(
    register,
    () => false,
    () => {},
  );
  assert.equal(starts, 0);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => null,
      setItem: () => {
        throw new Error("Storage unavailable");
      },
    },
  });
  await assert.rejects(
    recoverVatReceipts(
      register,
      () => true,
      () => {},
    ),
    /Storage unavailable/,
  );
  assert.equal(issuances, 0);
  assert.equal(starts, 0);
});
test("source validation preserves sale amounts and blocks mismatched or altered fiscal records", () => {
  const before = structuredClone(source);
  const payload = buildVatRecoveryPayload(
    source,
    "POS-20261111-209609",
    originalId,
    10865,
  );
  assert.equal(payload.inactiveId, originalId);
  assert.deepEqual(source, before);
  for (const change of [
    { status: "SUCCESS" },
    { id: "different" },
    { totalAmount: 1 },
    { posNo: "other" },
  ])
    assert.throws(() =>
      buildVatRecoveryPayload(
        { ...source, ...change },
        "POS-20261111-209609",
        originalId,
        10865,
      ),
    );
});

test("an empty local list reports read-only diagnostics without reserving or issuing a receipt", async () => {
  invalidPresent = false;
  await recoverVatReceipts(
    register,
    () => true,
    () => {},
  );
  assert.equal(starts, 0);
  assert.equal(issuances, 0);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].phase, "LIST_RECEIVED");
  assert.equal(diagnostics[0].invalidCount, 0);
  assert.equal(diagnostics[0].matchingCount, 0);
});
