import * as React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { WarehouseDispatchDocument } from "@mgl/types";
import { IncomingDispatchReview } from "./IncomingDispatchReview";

Object.assign(globalThis, { React });

const document: WarehouseDispatchDocument = {
  id: "dispatch-1",
  dispatchNumber: "PAD-001",
  storeName: "Тест дэлгүүр",
  recipientName: "Эзэн",
  recipientPhone: "99112233",
  recipientOrganizationId: "store-1",
  receiptStatus: "PENDING",
  acceptedAt: null,
  address: null,
  lat: null,
  lng: null,
  reason: null,
  note: null,
  paymentStatus: "CREDIT",
  paymentMethod: null,
  paymentNote: null,
  createdAt: "2026-11-20T10:00:00Z",
  createdByName: "Агуулахын ажилтан",
  warehouse: { id: "warehouse-1", name: "Төв агуулах", address: "" },
  totalQuantity: 3,
  totalAmount: "6000",
  items: [
    {
      id: "line-1",
      productId: "product-1",
      name: "Сүү",
      sku: "MILK-1",
      barcode: "0001234567890",
      quantity: 3,
      unit: "ш",
      unitPrice: "2000",
      totalAmount: "6000",
    },
  ],
};

function render(receiptStatus: "PENDING" | "ACCEPTED", submitting = false) {
  return renderToStaticMarkup(
    <IncomingDispatchReview
      document={{ ...document, receiptStatus }}
      submitting={submitting}
      onAccept={() => {}}
    />,
  );
}

test("pending padan shows product identity and prices and requires explicit review before acceptance", () => {
  const html = render("PENDING");
  assert.match(html, /PAD-001/);
  assert.match(html, /Сүү/);
  assert.match(html, /SKU: MILK-1/);
  assert.match(html, /Баркод: 0001234567890/);
  assert.match(html, /Тоо/);
  assert.match(html, /Нэгж үнэ/);
  assert.match(html, /Зарах үнэ/);
  assert.match(html, /aria-label="Сүү зарах үнэ"/);
  assert.match(html, /Бараа бүрийн зарах үнийг/);
  assert.match(html, /type="checkbox"/);
  assert.match(html, /disabled=""/);
  assert.match(html, /Зөвшөөрч, бүтээгдэхүүнд бүртгэх/);
  assert.doesNotMatch(html, /href="\/products"/);
});

test("accepted padan exposes catalog link and removes acceptance controls", () => {
  const html = render("ACCEPTED");
  assert.match(html, /Хүлээн авсан/);
  assert.match(html, /href="\/products"/);
  assert.doesNotMatch(html, /type="checkbox"/);
  assert.doesNotMatch(html, /Зөвшөөрч, бүтээгдэхүүнд бүртгэх/);
});

test("in-flight acceptance keeps review checkbox disabled", () => {
  const html = render("PENDING", true);
  assert.match(html, /type="checkbox" disabled=""/);
  assert.match(html, /Бүртгэж байна/);
});

test("missing barcode is explicit and never substitutes the SKU", () => {
  const html = renderToStaticMarkup(
    <IncomingDispatchReview
      document={{
        ...document,
        items: document.items.map((item) => ({ ...item, barcode: null })),
      }}
      submitting={false}
      onAccept={() => {}}
    />,
  );
  assert.match(html, /Баркод: Бүртгэлгүй/);
  assert.doesNotMatch(html, /Баркод: MILK-1/);
});

test("accepted padan allows sale price correction without receiving stock again", () => {
  const html = renderToStaticMarkup(
    <IncomingDispatchReview
      document={{
        ...document,
        receiptStatus: "ACCEPTED",
        items: document.items.map((item) => ({
          ...item,
          salePrice: "3000.00",
        })),
      }}
      submitting={false}
      onAccept={() => {}}
      onSavePrices={() => {}}
    />,
  );
  assert.match(html, /value="3000.00"/);
  assert.match(html, /Зарах үнэ хадгалах/);
  assert.doesNotMatch(html, /type="checkbox"/);
});

test("pending padan offers cancellation without requiring valid prices or receipt review", () => {
  const html = renderToStaticMarkup(
    <IncomingDispatchReview
      document={document}
      submitting={false}
      onAccept={() => {}}
      onCancel={() => {}}
    />,
  );
  assert.match(html, /Падаан цуцлах/);
  assert.match(
    html,
    /<button type="button" class="[^"]*">Падаан цуцлах<\/button>/,
  );
});

test("cancelled padan shows the reason and disables receipt and price controls", () => {
  const html = renderToStaticMarkup(
    <IncomingDispatchReview
      document={{
        ...document,
        receiptStatus: "CANCELLED",
        cancellationReason: "Буруу падаан",
      }}
      submitting={false}
      onAccept={() => {}}
      onCancel={() => {}}
    />,
  );
  assert.match(html, /Буруу падаан/);
  assert.match(html, /агуулахад буцаан бүртгэсэн/);
  assert.doesNotMatch(html, /type="checkbox"/);
  assert.doesNotMatch(html, /Падаан цуцлах/);
  assert.doesNotMatch(html, /Зөвшөөрч, бүтээгдэхүүнд бүртгэх/);
  assert.doesNotMatch(html, /Нэгдсэн нэмэгдэл/);
});
