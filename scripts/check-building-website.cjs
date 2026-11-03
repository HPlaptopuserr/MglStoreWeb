if (process.env.MGL_BUILDING_SMOKE_ALLOW_LOCAL_DB !== "1")
  throw new Error("Explicit local test flag required");
const assert = require("node:assert/strict"),
  crypto = require("node:crypto"),
  { createRequire } = require("node:module");
const req = createRequire(process.cwd() + "/apps/api/package.json");
req("dotenv").config({ path: ".env", quiet: true });
if (
  !["localhost", "127.0.0.1"].includes(
    new URL(process.env.DATABASE_URL).hostname,
  )
)
  throw new Error("Local database required");
const { PrismaClient } = require("@prisma/client"),
  db = new PrismaClient(),
  bcrypt = req("bcryptjs");
const { emptyWebsiteContent } = req("@mgl/types/building-website");
const base = "http://localhost:3005",
  api = "http://localhost:4000";
let userId, orgId, projectId, facadeProjectId;
(async () => {
  try {
    const email = `site-test-${crypto.randomUUID()}@example.invalid`,
      password = crypto.randomBytes(24).toString("hex");
    const user = await db.user.create({
      data: {
        email,
        role: "ADMIN",
        passwordHash: await bcrypt.hash(password, 10),
      },
    });
    userId = user.id;
    const org = await db.organization.create({
      data: {
        name: "Temporary website test",
        slug: `site-test-${crypto.randomUUID()}`,
        taxId: `site-test-${crypto.randomUUID()}`,
        businessBuildingEnabled: true,
        members: { create: { userId, role: "OWNER", isPrimary: true } },
      },
    });
    orgId = org.id;
    const project = await db.barilgaProject.create({
      data: {
        organizationId: orgId,
        title: "Website fixture",
        slug: `site-${crypto.randomUUID()}`,
        blocks: {
          create: {
            name: "A",
            floors: {
              create: {
                number: 4,
                units: {
                  create: [
                    {
                      unitNo: "401",
                      typeLabel: "1 өрөө",
                      rooms: 1,
                      areaM2: 33,
                    },
                    {
                      unitNo: "402",
                      typeLabel: "2 өрөө",
                      rooms: 2,
                      areaM2: 44,
                    },
                  ],
                },
              },
            },
          },
        },
      },
    });
    projectId = project.id;
    const login = await fetch(base + "/api/building-session", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: base },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie").split(";")[0],
      headers = {
        "Content-Type": "application/json",
        Origin: base,
        Cookie: cookie,
      };
    const dashboardUnit = await db.barilgaUnit.findFirstOrThrow({
      where: { floor: { block: { projectId } } },
    });
    const dashboardReservation = await db.barilgaReservation.create({
      data: {
        unitId: dashboardUnit.id,
        reservedById: userId,
        agreedPriceTotal: 1000,
        payments: {
          create: {
            amount: 100,
            status: "PAID",
            invoiceNumber: `dashboard-${crypto.randomUUID()}`,
          },
        },
        paymentSchedule: {
          create: [
            { amount: 250, dueDate: new Date("2020-01-01"), status: "PENDING" },
            { amount: 80, dueDate: new Date("2020-01-01"), status: "PAID" },
            {
              amount: 90,
              dueDate: new Date("2020-01-01"),
              status: "CANCELLED",
            },
            { amount: 750, dueDate: new Date("2099-01-01"), status: "PENDING" },
          ],
        },
      },
    });
    const customersResponse = await fetch(base + "/api/building/admin/customers", {headers});
    assert.equal(customersResponse.status, 200);
    const customers = await customersResponse.json();
    assert.equal(customers.total, 1);
    assert.equal(customers.records[0].paid, "100");
    assert.equal(customers.records[0].remaining, "900");
    assert.equal(customers.records[0].overdue, "250");
    assert.equal(customers.records[0].downPaymentPaid, "100");
    assert.equal(customers.records[0].monthlyPayments.length, 1);
    assert.equal(customers.records[0].monthlyPayments[0].total, "100");
    assert.equal(customers.records[0].monthlyPayments[0].downPayment, "100");
    assert.equal(customers.records[0].payments[0].kind, "DOWN_PAYMENT");
    assert.equal(customers.records[0].payments[0].provider, "MINU_POS");
    const emptyCustomers = await fetch(base + "/api/building/admin/customers?search=does-not-exist", {headers});
    assert.equal((await emptyCustomers.json()).total, 0);
    assert.equal((await fetch(base + "/api/building/admin/customers")).status, 401);
    console.log("PASS: customer scope, financial details, search and authentication.");
    const dashboardResponse = await fetch(
      base + "/api/building/admin/dashboard",
      { headers },
    );
    assert.equal(dashboardResponse.status, 200);
    const dashboard = await dashboardResponse.json();
    assert.equal(dashboard.blocks.length, 1);
    assert.equal(dashboard.finance.agreed, "1000");
    assert.equal(dashboard.finance.paid, "100");
    assert.equal(dashboard.finance.remaining, "900");
    assert.equal(dashboard.finance.overdue, "250");
    assert.equal(dashboard.overdue.length, 1);
    const navigation = await fetch(base + "/api/building/admin/navigation", { headers });
    assert.equal(navigation.status, 200);
    assert.deepEqual(await navigation.json(), { overdueCount: 1 });
    assert.equal((await fetch(base + "/api/building/admin/navigation")).status, 401);
    const outside = await fetch(
      base + "/api/building/admin/dashboard?project=" + crypto.randomUUID(),
      { headers },
    );
    assert.equal((await outside.json()).blocks.length, 0);
    assert.equal(
      (await fetch(base + "/api/building/admin/dashboard")).status,
      401,
    );
    await db.barilgaReservation.delete({
      where: { id: dashboardReservation.id },
    });
    console.log(
      "PASS: dashboard totals, confirmed payments, overdue exclusion, project scope and authentication.",
    );
    const facade = {
      image: "data:image/png;base64,iVBORw0KGgo=",
      regions: [
        {
          id: "region1",
          floor: 1,
          unitNo: "101",
          x: 10,
          y: 20,
          width: 90,
          height: 40,
        },
      ],
    };
    const fixtureBody = {
      title: "Facade fixture",
      slug: `facade-${crypto.randomUUID()}`,
      blocks: [
        {
          name: "A",
          facade,
          floors: [
            {
              number: 1,
              units: [
                { unitNo: "101", typeLabel: "Apartment", rooms: 1, areaM2: 33 },
              ],
            },
          ],
        },
      ],
    };
    const created = await fetch(`${base}/api/building/admin/projects`, {
      method: "POST",
      headers,
      body: JSON.stringify(fixtureBody),
    });
    assert.equal(created.status, 201);
    facadeProjectId = (await created.json()).project.id;
    let facadeRead = (
      await (
        await fetch(
          `${base}/api/building/admin/projects/${facadeProjectId}/website`,
          { headers },
        )
      ).json()
    ).project;
    assert.deepEqual(
      facadeRead.website.facadesByBlock[facadeRead.blocks[0].id],
      facade,
    );
    const changed = structuredClone(fixtureBody);
    changed.blocks[0].id = facadeRead.blocks[0].id;
    changed.blocks[0].facade.regions[0].x = 150;
    changed.updatedAt = facadeRead.updatedAt;
    const edited = await fetch(
      `${base}/api/building/admin/projects/${facadeProjectId}`,
      { method: "PATCH", headers, body: JSON.stringify(changed) },
    );
    assert.equal(edited.status, 200, await edited.text());
    facadeRead = (
      await (
        await fetch(
          `${base}/api/building/admin/projects/${facadeProjectId}/website`,
          { headers },
        )
      ).json()
    ).project;
    assert.equal(
      facadeRead.website.facadesByBlock[facadeRead.blocks[0].id].regions[0].x,
      150,
    );
    const invalid = structuredClone(fixtureBody);
    invalid.slug = `invalid-${crypto.randomUUID()}`;
    invalid.blocks[0].facade.regions[0].unitNo = "999";
    assert.equal(
      (
        await fetch(`${base}/api/building/admin/projects`, {
          method: "POST",
          headers,
          body: JSON.stringify(invalid),
        })
      ).status,
      400,
    );
    console.log(
      "PASS: facade image and region creation, reload, position edit, block remapping, invalid unit link rejection.",
    );
    const path = `${base}/api/building/admin/projects/${projectId}/website`;
    assert.equal((await fetch(path)).status, 401);
    let read = await fetch(path, { headers });
    assert.equal(read.status, 200);
    let p = (await read.json()).project;
    const content = {
      ...emptyWebsiteContent(),
      heroTitle: "Туршилтын шинэ гарчиг",
      heroSubtitle: "Server content test",
      phone: "+976 7777 0000",
      paymentTerms: "Туршилтын нөхцөл",
      faqs: [{ question: "Test?", answer: "Answer" }],
    };
    let save = await fetch(path, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ updatedAt: p.updatedAt, content }),
    });
    assert.equal(save.status, 200, await save.text());
    assert.equal(
      (
        await fetch(path, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ updatedAt: p.updatedAt, content }),
        })
      ).status,
      400,
      "stale revision rejected",
    );
    p = (await (await fetch(path, { headers })).json()).project;
    assert.equal(p.website.content.heroTitle, content.heroTitle);
    assert.equal(
      (
        await fetch(path, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            updatedAt: p.updatedAt,
            content: { ...content, heroImageUrl: "javascript:alert(1)" },
          }),
        })
      ).status,
      400,
    );
    const block = p.blocks[0],
      unit = block.floors[0].units[1];
    const planLibrary = {
      version: 1,
      plans: [
        {
          id: "test-plan",
          name: "Test plan",
          background: null,
          shapes: [
            {
              id: "rectangle",
              kind: "unit",
              label: "402",
              points: [
                { x: 10, y: 10 },
                { x: 100, y: 10 },
                { x: 100, y: 100 },
                { x: 10, y: 100 },
              ],
              unitSlot: 1,
            },
          ],
        },
      ],
      assignments: { 4: "test-plan" },
    };
    save = await fetch(path, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        updatedAt: p.updatedAt,
        blockId: block.id,
        planLibrary,
      }),
    });
    assert.equal(save.status, 200, await save.text());
    p = (await (await fetch(path, { headers })).json()).project;
    save = await fetch(
      `${base}/api/building/admin/projects/${projectId}/units/${unit.id}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          updatedAt: p.updatedAt,
          typeLabel: "2 өрөө",
          rooms: 2,
          areaM2: "44",
          priceTotal: "198000000",
          status: "SOLD",
          published: true,
        }),
      },
    );
    assert.equal(save.status, 200, await save.text());
    assert.equal(
      (await fetch(`${api}/api/building/projects/${projectId}/website`)).status,
      404,
      "draft is private",
    );
    p = (await (await fetch(path, { headers })).json()).project;
    assert.equal(
      (
        await fetch(path, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            updatedAt: p.updatedAt,
            basics: {
              title: p.title,
              description: "",
              district: "",
              address: "",
              status: "PUBLISHED",
              constructionStatus: "PLANNED",
            },
          }),
        })
      ).status,
      400,
      "unverified publication rejected",
    );
    await db.barilgaProject.update({
      where: { id: projectId },
      data: { status: "PUBLISHED", verification: "VERIFIED" },
    });
    const publicRead = await fetch(
      `${api}/api/building/projects/${projectId}/website`,
    );
    assert.equal(publicRead.status, 200);
    const pub = (await publicRead.json()).project;
    assert.equal(pub.blocks[0].floors[0].units.length, 1);
    assert.equal(
      pub.blocks[0].floors[0].units[0].planSlot,
      1,
      "hidden unit must not shift plan index",
    );
    assert.equal(pub.blocks[0].floors[0].units[0].status, "SOLD");
    assert.equal(
      pub.website.plansByBlock[block.id].plans[0].shapes[0].unitSlot,
      1,
    );
    assert.equal(pub.website.content.heroTitle, content.heroTitle);
    console.log(
      "PASS: authentication, server content persistence, stale write protection, unsafe image rejection, plan persistence, unit status/price, draft privacy, verification gate, stable public plan mapping.",
    );
  } finally {
    if (facadeProjectId)
      await db.barilgaProject.delete({ where: { id: facadeProjectId } });
    if (projectId) await db.barilgaProject.delete({ where: { id: projectId } });
    if (orgId) await db.organization.delete({ where: { id: orgId } });
    if (userId) await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
