import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import router from "./admin-sales-stores.routes";

test("store contact information requires an authenticated platform admin", async () => {
  const app = express();
  app.use(router);
  const server = app.listen(0, "127.0.0.1");
  try {
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    for (const suffix of ["", "/summary", "/export.xlsx", "/test-store"]) {
      const url: string = `http://127.0.0.1:${address.port}/admin/statistics/stores${suffix}`;
      assert.equal((await fetch(url)).status, 401);
      assert.equal(
        (await fetch(url, { headers: { authorization: "Bearer invalid" } }))
          .status,
        401,
      );
      const token = jwt.sign(
        { userId: "test-user", role: "USER", email: "test@example.invalid" },
        process.env.JWT_SECRET || "dev-secret-change-me",
      );
      assert.equal(
        (await fetch(url, { headers: { authorization: `Bearer ${token}` } }))
          .status,
        403,
      );
    }
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
