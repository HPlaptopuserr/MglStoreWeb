import assert from "node:assert/strict";
import { test } from "node:test";
import jwt from "jsonwebtoken";
import {
  createCatalogTicket,
  verifyCatalogTicket,
  type CatalogDownloadScope,
} from "./warehouse-catalog-ticket";
const scope: CatalogDownloadScope = {
  warehouseId: "central",
  userId: "operator",
  role: "ADMIN",
  search: "цай",
  status: "all",
  inStockOnly: true,
};

test("download ticket is scoped to a warehouse and cannot authenticate as a login token", () => {
  const ticket = createCatalogTicket(scope);
  assert.equal(verifyCatalogTicket(ticket, "central").userId, "operator");
  assert.throws(() => verifyCatalogTicket(ticket, "other"));
  assert.throws(() =>
    jwt.verify(ticket, process.env.JWT_SECRET || "dev-secret-change-me"),
  );
  assert.throws(() => verifyCatalogTicket(`${ticket}tampered`, "central"));
});

test("download ticket expires after two minutes", () => {
  const ticket = createCatalogTicket(scope);
  const original = Date.now;
  const issued = original();
  Date.now = () => issued + 121_000;
  try {
    assert.throws(() => verifyCatalogTicket(ticket, "central"), {
      name: "TokenExpiredError",
    });
  } finally {
    Date.now = original;
  }
});
