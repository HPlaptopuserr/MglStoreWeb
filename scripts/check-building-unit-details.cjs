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

    const endpoint = `${base}/api/building/admin/projects/${projectId}/website`;
    const read = async () => {
      const response = await fetch(endpoint, { headers });
      assert.equal(response.status, 200);
      return (await response.json()).project;
    };
    const patch = async (body) => {
      const project = await read();
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ updatedAt: project.updatedAt, ...body }),
      });
      assert.equal(response.status, 200, await response.text());
      return read();
    };
    let current = await read();
    const block = current.blocks[0],
      floor = block.floors[0],
      originalUnit = floor.units[0];
    await db.barilgaFloor.create({ data: { blockId: block.id, number: 5 } });
    const region = (id, slot) => ({
      id,
      kind: "unit",
      label: id === "region-one" ? "Үйлчилгээ 1" : "Үйлчилгээ 2",
      unitSlot: slot,
      points: [
        { x: 10, y: 10 },
        { x: 200, y: 10 },
        { x: 200, y: 200 },
        { x: 10, y: 200 },
      ],
    });
    const library = {
      version: 1,
      plans: [
        {
          id: "test-plan",
          name: "Test",
          background: null,
          shapes: [region("region-one", 0), region("region-two", null)],
        },
      ],
      assignments: { 4: "test-plan", 5: "test-plan" },
    };
    await db.barilgaProject.update({
      where: { id: projectId },
      data: {
        documents: {
          website: {
            content: emptyWebsiteContent(),
            plansByBlock: { [block.id]: library },
          },
        },
      },
    });
    current = await patch({ blockId: block.id, syncPlanUnits: true });
    const key = `${floor.id}:test-plan:region-one`;
    assert.equal(
      current.website.unitBindings[key],
      originalUnit.id,
      "legacy slot migrated once",
    );
    assert.equal(current.blocks[0].floors[0].units.find(unit => unit.id === originalUnit.id).typeLabel, "Үйлчилгээ 1", "legacy inventory keeps the region name visible");
    const secondKey = `${floor.id}:test-plan:region-two`;
    const secondId = current.website.unitBindings[secondKey];
    assert.ok(secondId);
    const otherFloor = current.blocks[0].floors.find(
      (item) => item.number === 5,
    );
    assert.notEqual(
      current.website.unitBindings[`${otherFloor.id}:test-plan:region-two`],
      secondId,
    );
    assert.equal(
      current.blocks[0].floors[0].units.find((item) => item.id === secondId)
        .areaM2,
      null,
    );
    const image =
      "data:image/png;base64," +
      (
        await req("sharp")({
          create: { width: 20, height: 20, channels: 4, background: "#d8bd84" },
        })
          .png()
          .toBuffer()
      ).toString("base64");
    const upload = await fetch(
      `${base}/api/building/admin/projects/${projectId}/media`,
      { method: "POST", headers, body: JSON.stringify({ image }) },
    );
    assert.equal(upload.status, 201, await upload.clone().text());
    const media = (await upload.json()).url;
    assert.equal((await fetch(base + media, { headers })).status, 200);
    assert.equal(
      (await fetch(base + media)).status,
      404,
      "draft media stays private",
    );
    const content = {
      description: "Байрны танилцуулга",
      layout2d: media,
      layout3d: media,
      gallery: [media],
      paymentTerms: "Урьдчилгаа 30%",
      useProjectPrice: false,
    };
    const changed = await fetch(
      `${base}/api/building/admin/projects/${projectId}/units/${secondId}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          updatedAt: current.updatedAt,
          unitNo: "399",
          typeLabel: "Үйлчилгээ 2",
          rooms: 3,
          areaM2: 80,
          pricePerM2: 5300000,
          status: "SOLD",
          published: true,
          unitContent: content,
        }),
      },
    );
    assert.equal(changed.status, 200, await changed.text());
    current = await patch({ pricePerM2: 6000000 });
    assert.equal(
      Number(
        current.blocks[0].floors[0].units.find((item) => item.id === secondId)
          .pricePerM2,
      ),
      5300000,
      "custom rate survives global update",
    );
    library.plans[0].shapes.reverse();
    current = await patch({ blockId: block.id, planLibrary: library });
    assert.equal(
      current.website.unitBindings[secondKey],
      secondId,
      "reordering and renumbering preserve identity",
    );
    const stored = current.blocks[0].floors[0].units.find(
      (item) => item.id === secondId,
    );
    assert.equal(stored.status, "SOLD");
    assert.equal(stored.unitNo, "399");
    assert.equal(Number(stored.areaM2), 80);
    assert.equal(current.website.unitContent[secondId].layout3d, media);
    assert.equal(
      current.website.unitContent[secondId].description,
      content.description,
    );
    const detailUrl = `${base}/building/manage/${projectId}/preview?block=${block.id}&floor=4&region=region-two&view=unit`;
    const page = await fetch(detailUrl, { headers });
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.ok(
      html.includes("Байрны дэлгэрэнгүй") ||
        html.includes("БАЙРНЫ ДЭЛГЭРЭНГҮЙ") ||
        html.includes("Борлуулалттай холбогдох") ||
        html.includes("1 м²-ийн үнэ"),
    );
    const parking = await db.barilgaFloor.create({
      data: { blockId: block.id, number: -2 },
    });
    await db.barilgaUnit.createMany({
      data: Array.from({ length: 500 }, (_, index) => ({
        floorId: parking.id,
        unitNo: `P${index + 1}`,
        typeLabel: "Зогсоол",
      })),
    });
    current = await read();
    const addBlock = await fetch(
      `${base}/api/building/admin/projects/${projectId}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          title: current.title,
          slug: current.slug,
          updatedAt: current.updatedAt,
          blocks: [
            { id: block.id, name: block.name, preserveInventory: true },
            {
              name: "B блок",
              floors: Array.from({ length: 16 }, (_, index) => ({
                number: index + 1,
                units: [],
              })),
            },
          ],
        }),
      },
    );
    assert.equal(addBlock.status, 200, await addBlock.text());
    current = await read();
    assert.equal(current.blocks.length, 2);
    assert.equal(
      current.blocks
        .find((item) => item.id === block.id)
        .floors.find((item) => item.number === -2).units.length,
      500,
    );
    assert.equal(
      current.website.unitBindings[secondKey],
      secondId,
      "adding a block preserves bindings",
    );
    assert.equal(
      current.website.unitContent[secondId].layout3d,
      media,
      "adding a block preserves unit media",
    );
    assert.equal(
      current.blocks.find((item) => item.id !== block.id).floors.length,
      16,
    );
    await db.barilgaProject.update({
      where: { id: projectId },
      data: { status: "PUBLISHED", verification: "VERIFIED" },
    });
    const publicProject = (
      await (
        await fetch(`${api}/api/building/projects/${projectId}/website`)
      ).json()
    ).project;
    assert.equal(publicProject.website.unitContent[secondId].layout2d, media);
    assert.equal(
      publicProject.blocks[0].floors.find((item) => item.number === 4).units
        .length,
      1,
    );
    assert.equal((await fetch(base + media)).status, 200);
    await db.barilgaUnit.update({
      where: { id: secondId },
      data: { published: false },
    });
    assert.equal(
      (await fetch(base + media)).status,
      404,
      "hidden unit media stays private in a published project",
    );
    console.log(
      "PASS: stable bindings, unit detail persistence, media privacy, custom prices, published filtering, adding a 16-floor block with existing 500-space parking inventory",
    );
  } finally {
    if (facadeProjectId)
      await db.barilgaProject.delete({ where: { id: facadeProjectId } });
    if (projectId) await db.barilgaProject.delete({ where: { id: projectId } });
    if (orgId) await db.organization.delete({ where: { id: orgId } });
    if (userId) await db.user.delete({ where: { id: userId } });
    if (projectId)
      await req("node:fs/promises").rm(
        req("node:path").join(
          process.cwd(),
          "apps/api/uploads/building",
          projectId,
        ),
        { recursive: true, force: true },
      );
    await db.$disconnect();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
