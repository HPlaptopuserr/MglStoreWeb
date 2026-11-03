if (process.env.MGL_BUILDING_SMOKE_ALLOW_LOCAL_DB !== "1")
  throw new Error(
    "Set MGL_BUILDING_SMOKE_ALLOW_LOCAL_DB=1 for temporary local test records",
  );
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");
const { createRequire } = require("node:module");
const apiRequire = createRequire(path.resolve("apps/api/package.json"));
apiRequire("dotenv").config({ path: ".env", quiet: true });
if (
  !["127.0.0.1", "localhost"].includes(
    new URL(process.env.DATABASE_URL).hostname,
  )
)
  throw Error("Local database only");
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
const base = "http://localhost:3005",
  api = "http://localhost:4000";
const suffix = crypto.randomBytes(6).toString("hex"),
  email = `building-reg-${suffix}@example.invalid`,
  password = crypto.randomBytes(16).toString("hex");
const orgIds = [];
let userId;
async function register(data) {
  return fetch(base + "/api/building-register", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
(async () => {
  try {
    const input = {
      mode: "new",
      email,
      password,
      fullName: "Test User",
      organizationName: "Temporary Building Signup",
      taxId: "T" + suffix,
      phone: String(80000000 + crypto.randomInt(9999999)),
      role: "ADMIN",
    };
    const r = await register(input);
    if (r.status !== 201)
      throw Error(`Registration ${r.status}: ${(await r.json()).message}`);
    orgIds.push((await r.json()).organizationId);
    const user = await db.user.findUnique({ where: { email } });
    userId = user.id;
    assert.equal(user.role, "USER");
    const org = await db.organization.findUnique({ where: { id: orgIds[0] } });
    assert.equal(org.isVerified, false);
    assert.equal(org.businessBuildingEnabled, true);
    assert.equal(org.businessPosEnabled, false);
    const login = await fetch(base + "/api/building-session", {
      method: "POST",
      headers: { Origin: base, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie").split(";")[0];
    const headers = {
      Origin: base,
      Cookie: cookie,
      "Content-Type": "application/json",
    };
    let orgs = await (
      await fetch(base + "/api/building/admin/organization", { headers })
    ).json();
    assert.equal(orgs.organization.id, orgIds[0]);
    const other = await db.organization.findFirst({
      where: { id: { notIn: orgIds }, deletedAt: null, status: "ACTIVE" },
      select: { id: true },
    });
    const denied = await fetch(base + "/api/building/admin/projects", {
      method: "POST",
      headers,
      body: JSON.stringify({
        organizationId: other.id,
        title: "Not allowed",
        slug: "not-allowed-" + suffix,
      }),
    });
    assert.equal(denied.status, 400);
    const own = await fetch(base + "/api/building/admin/projects", {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "Own draft",
        blocks: [
          {
            name: "A",
            floors: [
              {
                number: 1,
                units: [
                  { unitNo: "101", typeLabel: "A", rooms: 2, areaM2: 56.5 },
                ],
              },
              {
                number: 2,
                units: [
                  { unitNo: "201", typeLabel: "B", rooms: 3, areaM2: 78.25 },
                  { unitNo: "202", typeLabel: "C", rooms: 4, areaM2: 96 },
                ],
              },
            ],
          },
          {
            name: "B",
            floors: [
              {
                number: 1,
                units: [
                  {
                    unitNo: "101",
                    typeLabel: "Studio",
                    rooms: 1,
                    areaM2: 32.5,
                  },
                ],
              },
            ],
          },
        ],
        slug: "own-" + suffix,
      }),
    });
    assert.equal(own.status, 201);
    const created = await own.json();
    const inventory = await db.barilgaBlock.findMany({
      where: { projectId: created.project.id },
      include: { floors: { include: { units: true } } },
      orderBy: { sortOrder: "asc" },
    });
    assert.equal(inventory.length, 2);
    assert.equal(inventory[0].floors.length, 2);
    const special = inventory[0].floors
      .find((f) => f.number === 2)
      .units.find((u) => u.unitNo === "201");
    assert.equal(Number(special.areaM2), 78.25);
    assert.equal(special.rooms, 3);
    assert.equal(special.typeLabel, "B");
    assert.equal(
      inventory.flatMap((b) => b.floors.flatMap((f) => f.units)).length,
      4,
    );
    assert.ok(
      inventory.every((b) =>
        b.floors.every((f) => f.units.every((u) => !u.published)),
      ),
    );
    assert.equal(
      (
        await db.barilgaProject.findUnique({
          where: { id: created.project.id },
        })
      ).organizationId,
      orgIds[0],
    );
    const detail = await (await fetch(base + `/api/building/admin/projects/${created.project.id}`, { headers })).json();
    const editPayload = { title: "Updated draft", slug: detail.project.slug, updatedAt: detail.project.updatedAt, blocks: inventory.map(b => ({ name: b.name, floors: b.floors.map(f => ({ number: f.number, units: f.units.map(u => ({ unitNo: u.unitNo, typeLabel: u.typeLabel, rooms: u.rooms, areaM2: Number(u.areaM2) })) })) })) };
    const edit = await fetch(base + `/api/building/admin/projects/${created.project.id}`, { method: "PATCH", headers, body: JSON.stringify(editPayload) });
    assert.equal(edit.status, 200);
    const stale = await fetch(base + `/api/building/admin/projects/${created.project.id}`, { method: "PATCH", headers, body: JSON.stringify(editPayload) });
    assert.equal(stale.status, 400);
    const refreshed = await db.barilgaBlock.findMany({ where: { projectId: created.project.id }, include: { floors: { include: { units: true } } }, orderBy: { sortOrder: "asc" } });
    inventory.splice(0, inventory.length, ...refreshed);
    const soldId = inventory[0].floors[0].units[0].id;
    const reservedId = inventory[1].floors[0].units[0].id;
    await db.barilgaUnit.update({
      where: { id: soldId },
      data: { status: "SOLD" },
    });
    await db.barilgaUnit.update({
      where: { id: reservedId },
      data: { status: "RESERVED" },
    });
    const overviewResponse = await fetch(
      base + "/api/building/admin/inventory",
      { headers },
    );
    assert.equal(overviewResponse.status, 200);
    const overview = await overviewResponse.json();
    assert.deepEqual(overview.summary, {
      projects: 1,
      blocks: 2,
      total: 4,
      sold: 1,
      unsold: 3,
      available: 2,
      reserved: 1,
      contractPending: 0,
      hold: 0,
      cancelled: 0,
    });
    assert.equal(overview.units.length, 4);
    const sold = await (
      await fetch(base + "/api/building/admin/inventory?status=SOLD", {
        headers,
      })
    ).json();
    assert.equal(sold.total, 1);
    assert.equal(sold.units[0].id, soldId);
    assert.equal(
      (await fetch(base + "/api/building/admin/inventory?page=0", { headers }))
        .status,
      400,
    );
    assert.equal(
      (await register({ ...input, mode: "existing", password: "wrong" }))
        .status,
      401,
    );
    assert.equal((await register({ ...input, mode: "existing" })).status, 409);
    const beforeHash = user.passwordHash;
    const existing = await register({
      ...input,
      mode: "existing",
      taxId: "S" + suffix,
      organizationName: "Second temporary company",
    });
    assert.equal(existing.status, 201);
    orgIds.push((await existing.json()).organizationId);
    assert.equal(
      (await db.user.findUnique({ where: { id: userId } })).passwordHash,
      beforeHash,
    );
    await db.user.update({ where: { id: userId }, data: { role: "ADMIN" } });
    await db.organizationMember.updateMany({
      where: { userId },
      data: { isPrimary: false },
    });
    await db.organizationMember.updateMany({
      where: { userId, organizationId: orgIds[1] },
      data: { isPrimary: true },
    });
    const pinned = await (
      await fetch(base + "/api/building/admin/organization", { headers })
    ).json();
    assert.equal(pinned.organization.id, orgIds[0]);
    const list = await (
      await fetch(base + "/api/building/admin/projects", { headers })
    ).json();
    assert.ok(list.projects.every((p) => p.organizationId === orgIds[0]));
    await db.organizationMember.updateMany({
      where: { userId },
      data: { role: "STAFF" },
    });
    assert.equal(
      (await fetch(base + "/api/building/admin/projects", { headers })).status,
      403,
    );
    console.log(
      "PASS: new USER signup, scoped OWNER access, existing-user password unchanged, duplicate tax ID blocked, cross-organization writes blocked, revoked role denied.",
    );
  } finally {
    await db.organization.deleteMany({ where: { id: { in: orgIds } } });
    const u = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (u) {
      await db.userSession.deleteMany({ where: { userId: u.id } });
      await db.user.delete({ where: { id: u.id } });
    }
    await db.$disconnect();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
