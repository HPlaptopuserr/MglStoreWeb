if (process.env.MGL_BUILDING_SMOKE_ALLOW_LOCAL_DB !== "1")
  throw new Error(
    "Set MGL_BUILDING_SMOKE_ALLOW_LOCAL_DB=1 to allow temporary local test records",
  );
const assert = require("node:assert/strict");
const path = require("node:path");
const crypto = require("node:crypto");
const { createRequire } = require("node:module");
const requireApi = createRequire(path.resolve("apps/api/package.json"));
requireApi("dotenv").config({ path: ".env", quiet: true });
if (
  !["localhost", "127.0.0.1"].includes(
    new URL(process.env.DATABASE_URL).hostname,
  )
)
  throw new Error("Local database required");
const { PrismaClient } = require("@prisma/client");
const bcrypt = requireApi("bcryptjs");
const db = new PrismaClient();
const base = "http://localhost:3005";
let userId, projectId, organizationId;
(async () => {
  try {
    const email = `building-smoke-${crypto.randomUUID()}@example.invalid`;
    const password = crypto.randomBytes(24).toString("hex");
    const user = await db.user.create({
      data: {
        email,
        role: "ADMIN",
        passwordHash: await bcrypt.hash(password, 10),
      },
    });
    userId = user.id;
    const organization = await db.organization.create({
      data: {
        name: "Temporary building test",
        slug: `test-${crypto.randomUUID()}`,
        taxId: `test-${crypto.randomUUID()}`,
        businessBuildingEnabled: true,
        members: { create: { userId, role: "OWNER", isPrimary: true } },
      },
    });
    organizationId = organization.id;
    assert.equal(
      (await fetch(base + "/api/building/admin/projects")).status,
      401,
    );
    assert.equal(
      (
        await fetch(base + "/api/building-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "https://invalid.example",
          },
          body: JSON.stringify({ email, password }),
        })
      ).status,
      403,
    );
    const response = await fetch(base + "/api/building-session", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: base },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(response.status, 200);
    const setCookie = response.headers.get("set-cookie");
    assert.ok(setCookie.includes("HttpOnly"));
    assert.ok(setCookie.includes("SameSite=lax"));
    const cookie = setCookie.split(";")[0];
    const headers = {
      Cookie: cookie,
      Origin: base,
      "Content-Type": "application/json",
    };
    const projects = await fetch(base + "/api/building/admin/projects", {
      headers,
    });
    assert.equal(projects.status, 200);
    const organizations = await (
      await fetch(base + "/api/building/admin/organization", { headers })
    ).json();
    assert.equal(organizations.organization.id, organizationId);
    const created = await fetch(base + "/api/building/admin/projects", {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "Temporary building smoke test",
        slug: `smoke-${crypto.randomUUID()}`,
      }),
    });
    assert.equal(created.status, 201);
    projectId = (await created.json()).project.id;
    const dashboard = await (
      await fetch(base + "/building/manage", { headers })
    ).text();
    assert.ok(dashboard.includes("Миний төслүүд"));
    const form = await (
      await fetch(base + "/building/manage/new", { headers })
    ).text();
    assert.ok(form.includes("Ноорог хадгалах"));
    assert.equal(
      (
        await fetch(base + "/api/building/admin/projects", {
          method: "POST",
          headers: {
            Cookie: cookie,
            Origin: "https://invalid.example",
            "Content-Type": "application/json",
          },
          body: "{}",
        })
      ).status,
      403,
    );
    const out = await fetch(base + "/api/building-session", {
      method: "DELETE",
      headers,
    });
    assert.equal(out.status, 200);
    assert.ok(out.headers.get("set-cookie").includes("Max-Age=0"));
    console.log(
      "PASS: login, HttpOnly session, unauthenticated rejection, CSRF rejection, scoped proxy, draft creation, management pages, logout.",
    );
  } finally {
    if (projectId) await db.barilgaProject.delete({ where: { id: projectId } });
    if (organizationId)
      await db.organization.delete({ where: { id: organizationId } });
    if (userId) await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
