import assert from "node:assert/strict";
import test from "node:test";
import { buildSalesExportRows } from "./sales-export-rows";
import { createSalesHistoryDemo } from "./sales-history-demo";

test("exports product snapshots, cashier, local time and separate mixed payments", () => {
  const receipts = createSalesHistoryDemo(new Date("2026-09-29T04:00:00Z"));
  const rows = buildSalesExportRows(receipts);
  assert.equal(rows.details.length, 5);
  assert.equal(rows.sales.length, 5);
  assert.equal(rows.payments.length, 6);
  assert.equal(rows.details[0]["Баркод"], "0012345678901");
  assert.equal(rows.details[0]["Ажилтан"], "Тест — Бат");
  assert.equal(rows.details[0]["Цаг (Улаанбаатар)"], "09:30:00");
  assert.equal(rows.details[0]["Огноо"], "2026-09-29");
  assert.equal(rows.details[0]["Төлбөрийн хэлбэр"], "Бэлэн + Карт");
  assert.equal(rows.details[0]["Нэгж өртөг (борлуулалтын үеийн)"], 2000);
  assert.equal(
    rows.payments.reduce((sum, row) => sum + row["Төлбөрийн дүн"], 0),
    rows.sales.reduce((sum, row) => sum + row["Нийт төлөх"], 0),
  );
  assert.equal(
    rows.totals.reduce((sum, row) => sum + row["Борлуулалтын дүн"], 0),
    rows.details.reduce((sum, row) => sum + row["Борлуулалтын дүн"], 0),
  );
});

test("missing historical cost stays blank rather than reporting a zero cost", () => {
  const [receipt] = createSalesHistoryDemo();
  receipt.lines[0].unitCost = null;
  receipt.lines[0].costTotal = undefined;
  const rows = buildSalesExportRows([receipt]);
  assert.equal(rows.details[0]["Нэгж өртөг (борлуулалтын үеийн)"], "");
  assert.equal(rows.details[0]["Нийт өртөг (борлуулалтын үеийн)"], "");
});

 test("demo fills every export column and reconciles discounts and payments", () => {
  const receipts = createSalesHistoryDemo();
  const rows = buildSalesExportRows(receipts);
  for (const sheet of Object.values(rows)) {
    for (const row of sheet) {
      for (const [column, value] of Object.entries(row)) {
        assert.notEqual(value, "", `Missing demo value: ${column}`);
        assert.notEqual(value, undefined);
        assert.notEqual(value, null);
      }
    }
  }
  for (const receipt of receipts) {
    assert.equal(receipt.subTotal - receipt.discountTotal, receipt.grandTotal);
    assert.equal(receipt.paymentBreakdown?.reduce((sum, payment) => sum + payment.amount, 0), receipt.grandTotal);
  }
});
