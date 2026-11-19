import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@mgl/database";
import router from "./partners.routes";

let server: Server;
let url: string;
const restores: Array<() => void> = [];
function stub(target: object, key: string, value: unknown) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(target, key, value);
  restores.push(() => {
    Reflect.set(target, key, previous);
  });
}
function patch(name: unknown, role: string | null = "ADMIN") {
  return fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(role
        ? {
            Authorization: `Bearer ${jwt.sign({ userId: "actor", role }, process.env.JWT_SECRET || "dev-secret-change-me")}`,
          }
        : {}),
    },
    body: JSON.stringify({ name }),
  });
}
before(async () => {
  const app = express();
  app.use(express.json(), router);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  url = `http://127.0.0.1:${address.port}/partners/org/branches/branch/name`;
});
after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});
afterEach(() => {
  while (restores.length) restores.pop()?.();
});

test("renaming requires platform organization management permission", async () => {
  stub(prisma.branch, "findFirst", () =>
    assert.fail("Unauthorized request accessed branches"),
  );
  assert.equal((await patch("mgl-013", null)).status, 401);
  assert.equal((await patch("mgl-013", "USER")).status, 403);
  assert.equal((await patch("mgl-013", "HR_ADMIN")).status, 403);
});

test("invalid names are rejected before accessing the database", async () => {
  stub(prisma.branch, "findFirst", () =>
    assert.fail("Invalid request accessed branches"),
  );
  for (const name of [null, 13, {}, "  ", "a".repeat(201)]) {
    assert.equal((await patch(name)).status, 400);
  }
});

test("missing, deleted, or other organization branches cannot be renamed", async () => {
  stub(prisma.branch, "findFirst", async ({ where }: { where: unknown }) => {
    assert.deepEqual(where, {
      id: "branch",
      organizationId: "org",
      deletedAt: null,
      organization: { deletedAt: null },
    });
    return null;
  });
  stub(prisma.branch, "update", () =>
    assert.fail("Missing branch was updated"),
  );
  assert.equal((await patch("mgl-013")).status, 404);
});

test("renaming rejects a duplicate within the same organization", async () => {
  let reads = 0;
  stub(prisma.branch, "findFirst", async ({ where }: { where: unknown }) => {
    if (++reads === 1) return { id: "branch" };
    assert.deepEqual(where, {
      organizationId: "org",
      deletedAt: null,
      id: { not: "branch" },
      name: { equals: "mgl-013", mode: "insensitive" },
    });
    return { id: "other" };
  });
  stub(prisma.branch, "update", () => assert.fail("Duplicate name was saved"));
  assert.equal((await patch("mgl-013")).status, 409);
});

test("renaming trims the name and updates only the scoped branch name", async () => {
  let reads = 0;
  stub(prisma.branch, "findFirst", async () =>
    ++reads === 1 ? { id: "branch" } : null,
  );
  stub(prisma.branch, "update", async (args: unknown) => {
    assert.deepEqual(args, {
      where: { id: "branch", organizationId: "org", deletedAt: null },
      data: { name: "mgl-013" },
      select: { id: true, name: true },
    });
    return { id: "branch", name: "mgl-013" };
  });
  const response = await patch("  mgl-013  ");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: "branch", name: "mgl-013" });
});
