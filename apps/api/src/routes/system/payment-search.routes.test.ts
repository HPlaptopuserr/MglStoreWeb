import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import type { AddressInfo } from "node:net";
import router from "./payment-search.routes";

test("payment search requires a full admin and validates before accessing payment data", async () => {
  const app = express();
  app.use(router);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}/admin/payments/search`;
  try {
    const anonymous = await fetch(endpoint);
    assert.equal(anonymous.status, 401);
    for (const role of ["USER", "VENDOR", "FINANCE_ADMIN", "HR_ADMIN"]) {
      const token = jwt.sign(
        { userId: "test-only", role },
        process.env.JWT_SECRET || "dev-secret-change-me",
      );
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(response.status, 403, role);
    }
    for (const role of ["ADMIN", "SUPER_ADMIN"]) {
      const token = jwt.sign(
        { userId: "test-only", role },
        process.env.JWT_SECRET || "dev-secret-change-me",
      );
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(response.status, 400, role);
      assert.equal(response.headers.get("cache-control"), "no-store");
      const body: unknown = await response.json();
      assert.deepEqual(body, {
        message: "Лавлах дугаарын 3-аас доошгүй тэмдэгт оруулна уу",
      });
    }
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
