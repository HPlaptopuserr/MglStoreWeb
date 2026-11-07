import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import {
  parseManualDispatch,
  parseDispatchHistoryQuery,
} from "./warehouse-manual-dispatch.policy";

const draft = () => ({
  requestId: randomUUID(),
  storeName: "Дэлгүүр",
  recipientName: "Бат",
  recipientPhone: "99112233",
  items: [{ productId: "product", quantity: 2 }],
});
test("dispatch location is optional and absent coordinates never become 0,0", () => {
  for (const fields of [
    {},
    { lat: null, lng: null },
    { lat: "", lng: "", address: " " },
  ]) {
    const result = parseManualDispatch({ ...draft(), ...fields });
    assert.equal(result.lat, null);
    assert.equal(result.lng, null);
    assert.equal(result.address, null);
  }
  assert.equal(parseManualDispatch({ ...draft(), lat: 0, lng: 0 }).lat, 0);
});
test("dispatch rejects incomplete pins, bad contacts and duplicated or invalid items", () => {
  for (const fields of [
    { lat: 47.9 },
    { lat: 91, lng: 106 },
    { lat: "47.9", lng: 106 },
    { lat: Number.NaN, lng: 106 },
    { storeName: "" },
    { recipientName: "" },
    { recipientPhone: "123" },
    { items: [] },
    { items: [{ productId: "product", quantity: 0 }] },
    { items: [{ productId: "product", quantity: 1.5 }] },
    {
      items: [
        { productId: "product", quantity: 1 },
        { productId: "product", quantity: 1 },
      ],
    },
  ])
    assert.throws(() => parseManualDispatch({ ...draft(), ...fields }));
});
test("dispatch history validates pagination and bounds search input", () => {
  assert.equal(parseDispatchHistoryQuery({ page: "2" }).page, 2);
  assert.equal(
    parseDispatchHistoryQuery({ search: "x".repeat(300) }).search.length,
    120,
  );
  for (const page of ["0", "-1", "1.5", "100001", "oops"])
    assert.throws(() => parseDispatchHistoryQuery({ page }));
});

test("the deployed Warehouse address-and-pin payload remains valid during rollout", () => {
  const result = parseManualDispatch({
    address: "Хуучин харилцагчийн хаяг",
    lat: 47.9,
    lng: 106.9,
    items: [{ productId: "product", quantity: 2 }],
  });
  assert.equal(result.storeName, result.address);
  assert.equal(result.recipientName, null);
  assert.equal(result.recipientPhone, null);
  assert.equal(result.lat, 47.9);
  assert.equal(result.lng, 106.9);
  for (const location of [
    {},
    { address: "Хаяг" },
    { address: "Хаяг", lat: 47.9 },
  ]) {
    assert.throws(() =>
      parseManualDispatch({
        ...location,
        items: [{ productId: "product", quantity: 1 }],
      }),
    );
  }
});

test("paid dispatches require a supported payment method and preserve the trimmed note", () => {
  for (const paymentMethod of [
    "CASH",
    "BANK_TRANSFER",
    "CARD",
    "QPAY",
    "OTHER",
  ]) {
    const result = parseManualDispatch({
      ...draft(),
      paymentStatus: "PAID",
      paymentMethod,
      paymentNote: "  Гүйлгээ 123  ",
    });
    assert.equal(result.paymentStatus, "PAID");
    assert.equal(result.paymentMethod, paymentMethod);
    assert.equal(result.paymentNote, "Гүйлгээ 123");
  }
  for (const paymentMethod of [undefined, null, "", "UNKNOWN", 1, {}])
    assert.throws(() =>
      parseManualDispatch({ ...draft(), paymentStatus: "PAID", paymentMethod }),
    );
});

test("credit dispatches have no payment method; older clients leave payment unknown", () => {
  const credit = parseManualDispatch({
    ...draft(),
    paymentStatus: "CREDIT",
    paymentNote: "Баасан гарагт төлнө",
  });
  assert.equal(credit.paymentStatus, "CREDIT");
  assert.equal(credit.paymentMethod, null);
  assert.equal(credit.paymentNote, "Баасан гарагт төлнө");
  const legacy = parseManualDispatch(draft());
  assert.equal(legacy.paymentStatus, null);
  assert.equal(legacy.paymentMethod, null);
  assert.equal(legacy.paymentNote, null);
  for (const fields of [
    { paymentStatus: "CREDIT", paymentMethod: "CASH" },
    { paymentStatus: "UNKNOWN" },
    { paymentStatus: "" },
    { paymentMethod: "CASH" },
    { paymentNote: "Тайлбар" },
    { paymentStatus: "CREDIT", paymentNote: "x".repeat(501) },
    { paymentStatus: "CREDIT", paymentNote: 123 },
  ])
    assert.throws(() => parseManualDispatch({ ...draft(), ...fields }));
});
