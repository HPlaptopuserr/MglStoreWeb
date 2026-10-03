import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, mock, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma, type Prisma, type Capability } from "@mgl/database";
import router from "./app-control-members.routes";

let server: Server;
let url: string;
let memberRole = "STAFF";
let posEnabled = true;
let capabilities: Capability[] = [];
let writes = 0;
const restores: Array<() => void> = [];
function stub(
  target: object,
  key: string,
  implementation: (...args: never[]) => unknown,
) {
  const previous: unknown = Reflect.get(target, key);
  Reflect.set(
    target,
    key,
    mock.fn((...args: unknown[]) =>
      Reflect.apply(implementation, target, args),
    ),
  );
  restores.push(() => {
    Reflect.set(target, key, previous);
  });
}
const token = (role: string) =>
  jwt.sign(
    { userId: "admin", role },
    process.env.JWT_SECRET || "dev-secret-change-me",
  );
function patch(body: unknown, role = "ADMIN", path = url) {
  return fetch(path, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token(role)}`,
    },
    body: JSON.stringify(body),
  });
}
before(async () => {
  const app = express();
  app.use(express.json(), router);
  server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
  });
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/admin/organizations/store/members/employee/capabilities`;
});
after(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});
afterEach(() => {
  while (restores.length) restores.pop()?.();
});
beforeEach(() => {
  memberRole = "STAFF";
  posEnabled = true;
  capabilities = [];
  writes = 0;
  stub(
    prisma,
    "$transaction",
    async (run: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
      run(prisma),
  );
  stub(
    prisma.organizationMember,
    "findFirst",
    async (args: {
      where: {
        organizationId: string;
        id: string;
        isActive: boolean;
        deletedAt: null;
      };
    }) => {
      assert.equal(args.where.isActive, true);
      assert.equal(args.where.deletedAt, null);
      if (args.where.organizationId !== "store" || args.where.id !== "employee")
        return null;
      return {
        id: "employee",
        role: memberRole,
        capabilities,
        organization: {
          businessPosEnabled: posEnabled,
          businessSalesEnabled: true,
          businessOrdersEnabled: true,
          businessInventoryEnabled: true,
          businessAttendanceEnabled: true,
          businessTasksEnabled: true,
          businessDeliveryEnabled: false,
        },
      };
    },
  );
  stub(prisma.siteSetting, "findUnique", async () => ({ value: "false" }));
  stub(
    prisma.organizationMember,
    "updateMany",
    async (args: {
      data: { capabilities: Capability[] };
      where: { organizationId: string; capabilities: { equals: Capability[] } };
    }) => {
      assert.equal(args.where.organizationId, "store");
      assert.deepEqual(args.where.capabilities.equals, capabilities);
      writes += 1;
      capabilities = args.data.capabilities;
      return { count: 1 };
    },
  );
});

test("platform administrator can grant multiple enabled apps and revoke them", async () => {
  let response = await patch({
    capabilities: ["POS_CASHIER", "SALES_REPRESENTATIVE"],
    expectedCapabilities: [],
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    capabilities: ["POS_CASHIER", "SALES_REPRESENTATIVE"],
  });
  response = await patch({
    capabilities: [],
    expectedCapabilities: capabilities,
  });
  assert.equal(response.status, 200);
  assert.deepEqual(capabilities, []);
  assert.equal(writes, 2);
});
test("organization staff cannot invoke the admin endpoint", async () => {
  assert.equal(
    (
      await patch(
        { capabilities: ["POS_CASHIER"], expectedCapabilities: [] },
        "USER",
      )
    ).status,
    403,
  );
  assert.equal(writes, 0);
});
test("disabled apps reject new grants but allow revoking old grants", async () => {
  posEnabled = false;
  assert.equal(
    (await patch({ capabilities: ["POS_CASHIER"], expectedCapabilities: [] }))
      .status,
    409,
  );
  assert.equal(writes, 0);
  capabilities = ["POS_CASHIER"];
  assert.equal(
    (await patch({ capabilities: [], expectedCapabilities: ["POS_CASHIER"] }))
      .status,
    200,
  );
});
test("owner access cannot be replaced with employee grants", async () => {
  memberRole = "OWNER";
  assert.equal(
    (await patch({ capabilities: [], expectedCapabilities: [] })).status,
    409,
  );
  assert.equal(writes, 0);
});
test("organization boundaries and stale edits are enforced", async () => {
  assert.equal(
    (
      await patch(
        { capabilities: [], expectedCapabilities: [] },
        "ADMIN",
        url.replace("/store/", "/other/"),
      )
    ).status,
    404,
  );
  capabilities = ["POS_CASHIER"];
  assert.equal(
    (await patch({ capabilities: [], expectedCapabilities: [] })).status,
    409,
  );
  assert.equal(writes, 0);
});
test("invalid permissions and disabled checklist grants fail before mutation", async () => {
  assert.equal(
    (
      await patch({
        capabilities: ["PLATFORM_ADMIN"],
        expectedCapabilities: [],
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await patch({
        capabilities: ["QUALITY_TEMPLATE_MANAGE"],
        expectedCapabilities: [],
      })
    ).status,
    409,
  );
  assert.equal(writes, 0);
});
