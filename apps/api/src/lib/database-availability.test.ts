import assert from "node:assert/strict";
import { test } from "node:test";
import { isDatabaseUnavailable } from "./database-availability";

test("recognizes connection and pool failures without relying on an Error subclass", () => {
  for (const code of ["P1001", "P1002", "P1008", "P1017", "P2024"]) {
    assert.equal(isDatabaseUnavailable({ code }), true, code);
  }
});

test("recognizes PostgreSQL recovery errors reported without a Prisma code", () => {
  for (const message of [
    "FATAL: the database system is in recovery mode",
    "FATAL: the database system is starting up",
    "FATAL: the database system is shutting down",
    "Server has closed the connection.",
  ]) {
    assert.equal(isDatabaseUnavailable(new Error(message)), true, message);
  }
});

test("does not misclassify validation, schema, or application errors as temporary outages", () => {
  for (const cause of [
    null,
    undefined,
    "offline",
    {},
    new Error("Unexpected failure"),
    { code: "P2002" },
    { code: "P2022" },
  ]) {
    assert.equal(isDatabaseUnavailable(cause), false);
  }
});
