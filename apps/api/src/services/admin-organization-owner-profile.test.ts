import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { Prisma } from "@mgl/database";
import { PrismaClient } from "@prisma/client";
import {
  getAdminOrganizationConflictMessage,
  saveAdminOrganizationOwnerProfile,
} from "./admin-organization-owner-profile";

test("organization conflicts distinguish owner phones from organization identifiers", () => {
  const conflict = (modelName: string) =>
    new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "5.22.0",
      meta: { modelName, target: null },
    });
  assert.match(
    getAdminOrganizationConflictMessage(conflict("Profile")) ?? "",
    /Нэвтрэх утас/,
  );
  assert.match(
    getAdminOrganizationConflictMessage(conflict("Organization")) ?? "",
    /татварын дугаар/,
  );
  assert.equal(
    getAdminOrganizationConflictMessage(new Error("connection failure")),
    null,
  );
  assert.equal(getAdminOrganizationConflictMessage(null), null);
});

const databaseUrl = process.env.PHONE_GUARD_TEST_DATABASE_URL;
test(
  "organization owner writes work with the production phone-reservation trigger",
  {
    skip: !databaseUrl,
  },
  async (t) => {
    const url = new URL(databaseUrl!);
    assert.ok(
      ["localhost", "127.0.0.1"].includes(url.hostname),
      "Local test database required",
    );
    const schema = `admin_owner_${randomUUID().replaceAll("-", "")}`;
    const admin = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });
    url.searchParams.set("schema", schema);
    const db = new PrismaClient({
      datasources: { db: { url: url.toString() } },
    });
    const migrations = resolve(
      __dirname,
      "../../../../packages/database/prisma/migrations",
    );
    const migration = (name: string) =>
      readFileSync(resolve(migrations, name, "migration.sql"), "utf8");
    try {
      await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
      const setup = spawnSync(
        "psql",
        [databaseUrl!, "-X", "-v", "ON_ERROR_STOP=1"],
        {
          encoding: "utf8",
          env: { ...process.env, PGOPTIONS: `-c search_path=${schema}` },
          input: `CREATE TABLE "User" (id TEXT PRIMARY KEY, "isActive" BOOLEAN DEFAULT true, "deletedAt" TIMESTAMP);
        CREATE TABLE "Profile" ("userId" TEXT PRIMARY KEY REFERENCES "User"(id), "phoneNumber" TEXT, "fullName" TEXT,
          "avatarUrl" TEXT, "birthDate" TIMESTAMP, gender TEXT, "birthPlaceCode" TEXT,
          "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now());
        ${migration("20260916133000_enforce_unique_profile_phone")}
        ${migration("20261120060000_reserve_profile_phone_numbers")}
        INSERT INTO "User" (id) VALUES ('owner'), ('new-owner'), ('other');
        INSERT INTO "Profile" ("userId", "fullName", "phoneNumber") VALUES ('owner', 'Owner', '91111111'), ('other', 'Other', '92222222');`,
        },
      );
      assert.equal(setup.status, 0, setup.stderr);
      await t.test(
        "reproduces native upsert rejecting the owner's unchanged phone",
        async () => {
          await assert.rejects(
            db.profile.upsert({
              where: { userId: "owner" },
              update: { fullName: "Owner", phoneNumber: "91111111" },
              create: {
                userId: "owner",
                fullName: "Owner",
                phoneNumber: "91111111",
              },
            }),
            (error: unknown) =>
              getAdminOrganizationConflictMessage(error)?.startsWith(
                "Нэвтрэх утас",
              ) === true,
          );
        },
      );
      await t.test(
        "links an existing owner and preserves their own phone reservation",
        async () => {
          await db.$transaction((tx) =>
            saveAdminOrganizationOwnerProfile(tx, "owner", {
              fullName: "Updated Owner",
              phoneNumber: "+976 9111-1111",
            }),
          );
          const profile = await db.profile.findUniqueOrThrow({
            where: { userId: "owner" },
          });
          assert.equal(profile.fullName, "Updated Owner");
          assert.equal(profile.phoneNumber, "91111111");
          const reservations = await db.$queryRaw<
            Array<{ profileCount: number }>
          >`SELECT "profileCount" FROM "ProfilePhoneReservation" WHERE "phoneNumber" = '91111111'`;
          assert.equal(reservations[0]?.profileCount, 1);
        },
      );
      await t.test("creates a missing profile", async () => {
        await db.$transaction((tx) =>
          saveAdminOrganizationOwnerProfile(tx, "new-owner", {
            fullName: "New Owner",
            phoneNumber: "93333333",
          }),
        );
        assert.equal(
          (
            await db.profile.findUniqueOrThrow({
              where: { userId: "new-owner" },
            })
          ).phoneNumber,
          "93333333",
        );
      });
      await t.test(
        "rejects another account's phone and rolls back the profile edit",
        async () => {
          await assert.rejects(
            db.$transaction((tx) =>
              saveAdminOrganizationOwnerProfile(tx, "owner", {
                fullName: "Rejected",
                phoneNumber: "92222222",
              }),
            ),
            (error: unknown) =>
              getAdminOrganizationConflictMessage(error)?.startsWith(
                "Нэвтрэх утас",
              ) === true,
          );
          const profile = await db.profile.findUniqueOrThrow({
            where: { userId: "owner" },
          });
          assert.equal(profile.fullName, "Updated Owner");
          assert.equal(profile.phoneNumber, "91111111");
        },
      );
    } finally {
      await db.$disconnect();
      await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
      await admin.$disconnect();
    }
  },
);
