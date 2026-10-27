import assert from "node:assert/strict";
import { test } from "node:test";
import type { AddressInfo } from "node:net";
import express from "express";
import jwt from "jsonwebtoken";
import router from "./index";

test("building administration rejects anonymous and missing users", async () => {
  const { prisma } = await import("@mgl/database");
  const originalUser = prisma.user.findFirst;
  Reflect.set(prisma.user, "findFirst", async () => null);
  const app = express();
  app.use(express.json(), router);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  try {
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    for (const path of ["/admin/projects", "/admin/organization"]) {
      assert.equal((await fetch(base + path)).status, 401);
      const token = jwt.sign(
        { userId: "customer", role: "USER" },
        process.env.JWT_SECRET || "dev-secret-change-me",
      );
      assert.equal(
        (
          await fetch(base + path, {
            headers: { Authorization: `Bearer ${token}` },
          })
        ).status,
        403,
      );
    }
    assert.equal(
      (
        await fetch(base + "/admin/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        })
      ).status,
      401,
    );
  } finally {
    Reflect.set(prisma.user, "findFirst", originalUser);
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("public projects query excludes private projects and customer reservation data", async () => {
  const { prisma } = await import("@mgl/database");
  const original = prisma.barilgaProject.findMany;
  let captured: unknown;
  Reflect.set(prisma.barilgaProject, "findMany", async (args: unknown) => {
    captured = args;
    return [];
  });
  const app = express();
  app.use(router);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  try {
    const response = await fetch(
      `http://127.0.0.1:${(server.address() as AddressInfo).port}/projects`,
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { projects: [] });
    const query = captured as {
      where: Record<string, unknown>;
      select: Record<string, unknown>;
    };
    assert.deepEqual(query.where, {
      deletedAt: null,
      status: "PUBLISHED",
      verification: "VERIFIED",
      organization: { deletedAt: null, status: "ACTIVE" },
    });
    assert.equal("reservations" in query.select, false);
    assert.equal("documents" in query.select, false);
  } finally {
    Reflect.set(prisma.barilgaProject, "findMany", original);
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
