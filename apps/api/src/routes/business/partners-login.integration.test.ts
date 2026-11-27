import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "@mgl/database";
import router from "./partners.routes";

// Run against a disposable local schema with the profile-phone migrations
// applied; DATABASE_URL must point to the same schema as this opt-in variable.
const databaseUrl = process.env.PARTNER_LOGIN_TEST_DATABASE_URL;
test(
  "one personal account can own multiple organizations and work in another",
  { skip: !databaseUrl },
  async () => {
    const url = new URL(databaseUrl!);
    assert.ok(["127.0.0.1", "localhost"].includes(url.hostname));
    assert.match(url.searchParams.get("schema") ?? "", /^hr_login_[a-z0-9_]+$/);
    assert.equal(process.env.DATABASE_URL, databaseUrl);
    const triggers = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT count(*) AS count FROM pg_trigger
    WHERE tgrelid = '"Profile"'::regclass AND tgname = 'Profile_normalize_phoneNumber'
  `;
    assert.equal(
      Number(triggers[0]?.count),
      1,
      "Production phone guard must be installed",
    );
    const suffix = randomUUID();
    const passwordHash = await bcrypt.hash("test-password", 4);
    const user = await prisma.user.create({
      data: {
        email: `${suffix}@example.invalid`,
        passwordHash,
        profile: {
          create: { fullName: "Shared User", phoneNumber: "96880096" },
        },
      },
    });
    const organizations: string[] = [];
    const app = express();
    app.use(express.json(), router);
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const port = address.port;
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: "ADMIN" },
      process.env.JWT_SECRET || "dev-secret-change-me",
    );
    async function grant(
      organizationId: string,
      role: "OWNER" | "STAFF",
      phone = "96880096",
    ) {
      return fetch(
        `http://127.0.0.1:${port}/partners/${organizationId}/members`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fullName: "Submitted Name",
            email: user.email,
            phone,
            role,
          }),
        },
      );
    }
    try {
      for (const [index, role] of (
        ["OWNER", "OWNER", "STAFF"] as const
      ).entries()) {
        const organization = await prisma.organization.create({
          data: {
            name: `Test ${index}`,
            slug: `${suffix}-${index}`,
            taxId: `${suffix}-${index}`,
          },
        });
        organizations.push(organization.id);
        const response = await grant(
          organization.id,
          role,
          index === 2 ? "99999999" : "96880096",
        );
        assert.equal(response.status, 201, await response.text());
      }
      assert.equal((await grant(organizations[0], "OWNER")).status, 409);
      const memberships = await prisma.organizationMember.findMany({
        where: { userId: user.id },
        orderBy: { role: "asc" },
      });
      assert.deepEqual(memberships.map((member) => member.role).sort(), [
        "OWNER",
        "OWNER",
        "STAFF",
      ]);
      assert.ok(memberships.every((member) => member.isActive));
      assert.equal(
        await prisma.user.count({ where: { email: user.email } }),
        1,
      );
      const profile = await prisma.profile.findUniqueOrThrow({
        where: { userId: user.id },
      });
      assert.equal(profile.fullName, "Shared User");
      assert.equal(profile.phoneNumber, "96880096");
      assert.equal(
        (await prisma.user.findUniqueOrThrow({ where: { id: user.id } }))
          .passwordHash,
        passwordHash,
      );

      await prisma.organizationMember.update({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: organizations[2],
          },
        },
        data: { isActive: false, deletedAt: new Date() },
      });
      assert.equal((await grant(organizations[2], "STAFF")).status, 201);
      assert.equal(
        await prisma.organizationMember.count({
          where: { userId: user.id, isActive: true },
        }),
        3,
      );
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await prisma.organization.deleteMany({
        where: { id: { in: organizations } },
      });
      await prisma.user.delete({ where: { id: user.id } });
      await prisma.$disconnect();
    }
  },
);
