if (process.env.MGL_BUILDING_SMOKE_ALLOW_LOCAL_DB !== "1")
  throw Error("Local test flag required");
const { createRequire } = require("node:module"),
  crypto = require("node:crypto"),
  assert = require("node:assert/strict");
const req = createRequire(process.cwd() + "/apps/api/package.json");
req("dotenv").config({ path: ".env", quiet: true });
if (
  !["localhost", "127.0.0.1"].includes(
    new URL(process.env.DATABASE_URL).hostname,
  )
)
  throw Error("Local DB only");
const { PrismaClient } = req("@prisma/client"),
  db = new PrismaClient(),
  jwt = req("jsonwebtoken");
const ids = [];
let orgId, projectId;
async function call(path, token, body) {
  const r = await fetch("http://localhost:4000/api/building/" + path, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: r.status, data: await r.json() };
}
(async () => {
  try {
    const users = [];
    for (let i = 0; i < 3; i++) {
      const u = await db.user.create({
        data: {
          email: `purchase-${crypto.randomUUID()}@example.invalid`,
          role: "USER",
        },
      });
      ids.push(u.id);
      users.push(u);
    }
    const [seller, buyer, other] = users;
    const org = await db.organization.create({
      data: {
        name: "Purchase smoke",
        slug: crypto.randomUUID(),
        taxId: crypto.randomUUID(),
        businessBuildingEnabled: true,
        members: {
          create: { userId: seller.id, role: "OWNER", isPrimary: true },
        },
      },
    });
    orgId = org.id;
    const p = await db.barilgaProject.create({
      data: {
        title: "Purchase smoke",
        slug: crypto.randomUUID(),
        organizationId: orgId,
        blocks: {
          create: {
            name: "A",
            floors: {
              create: {
                number: 4,
                units: {
                  create: {
                    unitNo: "401",
                    status: "AVAILABLE",
                    areaM2: 33,
                    priceTotal: 1000,
                  },
                },
              },
            },
          },
        },
      },
      include: {
        blocks: { include: { floors: { include: { units: true } } } },
      },
    });
    projectId = p.id;
    const unit = p.blocks[0].floors[0].units[0];
    const token = (u) =>
      jwt.sign(
        {
          userId: u.id,
          email: u.email,
          role: u.role,
          ...(u.id === seller.id ? { organizationId: orgId } : {}),
        },
        process.env.JWT_SECRET || "dev-secret-change-me",
        { expiresIn: "10m" },
      );
    const st = token(seller),
      bt = token(buyer),
      ot = token(other);
    const input = {
      unitId: unit.id,
      buyerEmail: buyer.email,
      customerName: "Smoke Buyer",
      customerPhone: "",
      total: "1000",
      terms: "Test agreed terms",
      requestKey: crypto.randomUUID(),
      schedule: [
        { date: "2026-11-01", amount: "300", kind: "DOWN_PAYMENT" },
        { date: "2026-12-01", amount: "700", kind: "MONTHLY" },
      ],
    };
    assert.equal(
      (await call("admin/purchases", st, { ...input, total: "999" })).status,
      409,
    );
    const created = await call("admin/purchases", st, input);
    assert.equal(created.status, 201, JSON.stringify(created.data));
    const id = created.data.contract.id;
    assert.equal(
      (await call("admin/purchases", st, input)).data.contract.id,
      id,
    );
    assert.equal(
      (
        await call("admin/purchases", st, {
          ...input,
          requestKey: crypto.randomUUID(),
        })
      ).status,
      409,
    );
    assert.equal(
      (await db.barilgaUnit.findUnique({ where: { id: unit.id } })).status,
      "CONTRACT_PENDING",
    );
    assert.equal((await call("buyer/purchases", ot)).data.contracts.length, 0);
    assert.equal(
      (await call(`buyer/purchases/${id}/accept`, ot, { accepted: true }))
        .status,
      409,
    );
    assert.equal(
      (await call(`buyer/purchases/${id}/accept`, st, { accepted: true }))
        .status,
      409,
    );
    assert.equal(
      (await call(`admin/purchases/${id}/accept`, st, { accepted: true })).data
        .contract.status,
      "PENDING",
    );
    assert.equal(
      await db.barilgaReservation.count({ where: { unitId: unit.id } }),
      0,
    );
    const accepted = await call(`buyer/purchases/${id}/accept`, bt, {
      accepted: true,
    });
    assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
    assert.equal(accepted.data.contract.status, "COMPLETED");
    await call(`buyer/purchases/${id}/accept`, bt, { accepted: true });
    assert.equal(
      await db.barilgaReservation.count({ where: { unitId: unit.id } }),
      1,
    );
    assert.equal(
      await db.barilgaPayment.count({
        where: { reservation: { unitId: unit.id } },
      }),
      0,
    );
    assert.equal(
      await db.barilgaPaymentSchedule.count({
        where: { reservation: { unitId: unit.id }, status: "PENDING" },
      }),
      2,
    );
    assert.equal(
      (await db.barilgaUnit.findUnique({ where: { id: unit.id } })).status,
      "SOLD",
    );
    const customer = await call("admin/customers", st);
    assert.equal(customer.data.total, 1);
    assert.equal(customer.data.records[0].paid, "0");
    const proxy = await fetch(
      "http://localhost:3005/api/building/buyer/purchases",
      { headers: { Cookie: "mgl_building_session=" + bt } },
    );
    assert.equal(proxy.status, 200);
    assert.equal((await proxy.json()).contracts.length, 1);
    const options = await call("admin/inventory-options", st);
    assert.equal(options.data.projects.length, 1);
    const filtered = await call(
      `admin/inventory?block=${p.blocks[0].id}&floor=99`,
      st,
    );
    assert.equal(filtered.data.total, 0);
    assert.equal(
      (await call(`admin/purchases/${id}/cancel`, st, {})).status,
      409,
    );
    const secondUnit = await db.barilgaUnit.create({
      data: { floorId: unit.floorId, unitNo: "402", status: "AVAILABLE" },
    });
    const second = await call("admin/purchases", st, {
      ...input,
      unitId: secondUnit.id,
      requestKey: crypto.randomUUID(),
    });
    const cancelled = await call(
      `admin/purchases/${second.data.contract.id}/cancel`,
      st,
      {},
    );
    assert.equal(cancelled.data.contract.status, "CANCELLED");
    assert.equal(
      (await db.barilgaUnit.findUnique({ where: { id: secondUnit.id } }))
        .status,
      "AVAILABLE",
    );
    assert.equal(
      (
        await call(`buyer/purchases/${second.data.contract.id}/accept`, bt, {
          accepted: true,
        })
      ).status,
      409,
    );
    console.log(
      "PASS: schedule validation, scoped buyer, duplicate booking protection, idempotency, independent approvals, CRM conversion and unpaid schedules.",
    );
  } finally {
    if (projectId) {
      await db.barilgaPurchaseContract.deleteMany({
        where: { unit: { floor: { block: { projectId } } } },
      });
      await db.barilgaProject.delete({ where: { id: projectId } });
    }
    if (orgId) await db.organization.delete({ where: { id: orgId } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await db.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
