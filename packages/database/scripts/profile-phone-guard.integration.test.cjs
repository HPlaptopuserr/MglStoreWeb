const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { PrismaClient } = require("@prisma/client");

const databaseUrl = process.env.PHONE_GUARD_TEST_DATABASE_URL;

test("phone reservations enforce uniqueness without changing legacy accounts", {
  skip: !databaseUrl,
}, async (t) => {
  const url = new URL(databaseUrl);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname), "Local test database required");
  const schema = `phone_guard_${randomUUID().replaceAll("-", "")}`;
  const admin = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  url.searchParams.set("schema", schema);
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  const migration = fs.readFileSync(path.resolve(__dirname,
    "../prisma/migrations/20261120060000_reserve_profile_phone_numbers/migration.sql"), "utf8");
  const oldMigration = fs.readFileSync(path.resolve(__dirname,
    "../prisma/migrations/20260916133000_enforce_unique_profile_phone/migration.sql"), "utf8");
  const sql = (input) => {
    const result = spawnSync("psql", [databaseUrl, "-X", "-v", "ON_ERROR_STOP=1"], {
      input, encoding: "utf8", env: { ...process.env, PGOPTIONS: `-c search_path=${schema}` },
    });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
  };
  const insert = async (client, id, phone) => {
    await client.$executeRaw`INSERT INTO "User" (id) VALUES (${id})`;
    await client.$executeRaw`INSERT INTO "Profile" ("userId", "phoneNumber") VALUES (${id}, ${phone})`;
  };
  const create = (id, phone) => db.$transaction((tx) => insert(tx, id, phone));
  const rejected = (action) => assert.rejects(action, (error) =>
    error.code === "P2010" && ["23505", "40001"].includes(error.meta?.code));
  const count = async (phone) => {
    const rows = await db.$queryRaw`SELECT "profileCount" FROM "ProfilePhoneReservation" WHERE "phoneNumber" = ${phone}`;
    return rows[0]?.profileCount ?? 0;
  };
  try {
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    sql(`CREATE TABLE "User" (id TEXT PRIMARY KEY, "isActive" BOOLEAN DEFAULT true, "deletedAt" TIMESTAMP);
      CREATE TABLE "Profile" ("userId" TEXT PRIMARY KEY REFERENCES "User"(id), "phoneNumber" TEXT, "fullName" TEXT,
        "avatarUrl" TEXT, "birthDate" TIMESTAMP, gender TEXT, "birthPlaceCode" TEXT,
        "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now());
      INSERT INTO "User" (id, "isActive") VALUES ('legacy-a', true), ('legacy-b', false), ('disabled', false);
      INSERT INTO "Profile" ("userId", "phoneNumber", "fullName") VALUES ('legacy-a', '90696900', 'A'), ('legacy-b', '+976 9069-6900', 'B'), ('disabled', '95555555', 'C');
      ${oldMigration}
      ${migration}`);

    await t.test("backfill preserves duplicates and counts normalized phones", async () => {
      assert.equal(await count("90696900"), 2);
      const rows = await db.$queryRaw`SELECT "phoneNumber" FROM "Profile" WHERE "userId" = 'legacy-b'`;
      assert.equal(rows[0].phoneNumber, "+976 9069-6900");
      await rejected(create("legacy-third", "+976 90696900"));
      await db.$executeRaw`UPDATE "Profile" SET "phoneNumber" = '90696900', "fullName" = 'Updated' WHERE "userId" = 'legacy-b'`;
      assert.equal(await count("90696900"), 2);
    });
    await t.test("inactive accounts keep their phone reserved", async () => {
      await rejected(create("disabled-duplicate", "9555-5555"));
    });
    await t.test("Prisma reports the existing API phone-conflict error code", async () => {
      await db.$executeRaw`INSERT INTO "User" (id) VALUES ('prisma-conflict')`;
      await assert.rejects(db.profile.create({ data: {
        userId: "prisma-conflict", fullName: "Duplicate", phoneNumber: "+976 95555555",
      } }), (error) => error.code === "P2002");
    });
    await t.test("normalization, empty numbers and atomic profile edits", async () => {
      await create("first", "+976 (9111) 1111");
      assert.equal(await count("91111111"), 1);
      await rejected(create("second", "9111-1111"));
      await create("empty-a", null);
      await create("empty-b", " ");
      await rejected(db.$executeRaw`UPDATE "Profile" SET "phoneNumber" = '95555555' WHERE "userId" = 'first'`);
      assert.equal(await count("91111111"), 1);
      await db.$executeRaw`UPDATE "Profile" SET "phoneNumber" = '92222222' WHERE "userId" = 'first'`;
      assert.equal(await count("91111111"), 0);
      await create("reuse", "91111111");
    });
    await t.test("deletion releases only the last legacy reservation", async () => {
      await db.$executeRaw`DELETE FROM "Profile" WHERE "userId" = 'legacy-a'`;
      assert.equal(await count("90696900"), 1);
      await rejected(create("still-reserved", "90696900"));
      await db.$executeRaw`UPDATE "Profile" SET "phoneNumber" = NULL WHERE "userId" = 'legacy-b'`;
      assert.equal(await count("90696900"), 0);
      await create("legacy-reuse", "90696900");
    });
    await t.test("rolled back registrations leave no reservation", async () => {
      await assert.rejects(db.$transaction(async (tx) => {
        await insert(tx, "rollback", "93333333");
        throw new Error("intentional rollback");
      }), /intentional rollback/);
      assert.equal(await count("93333333"), 0);
      await create("after-rollback", "93333333");
    });
    for (const [index, isolationLevel] of ["ReadCommitted", "RepeatableRead", "Serializable"].entries()) {
      await t.test(`simultaneous claims at ${isolationLevel} allow one winner`, async () => {
        const phone = `9444444${index}`;
        let releaseWinner;
        const winnerGate = new Promise((resolve) => { releaseWinner = resolve; });
        let winnerReady;
        const ready = new Promise((resolve) => { winnerReady = resolve; });
        const winner = db.$transaction(async (tx) => {
          await insert(tx, `winner-${index}`, phone);
          winnerReady();
          await winnerGate;
        }, { timeout: 10000 });
        await ready;
        let contenderReady;
        const snapshotReady = new Promise((resolve) => { contenderReady = resolve; });
        const contender = db.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT count(*) FROM "Profile"`;
          contenderReady();
          await insert(tx, `contender-${index}`, `+976 ${phone}`);
        }, { isolationLevel, timeout: 10000 });
        const rejection = rejected(contender);
        await snapshotReady;
        releaseWinner();
        await Promise.all([winner, rejection]);
        assert.equal(await count(phone), 1);
        const rows = await db.$queryRaw`SELECT "userId" FROM "Profile" WHERE "phoneNumber" = ${phone}`;
        assert.equal(rows.length, 1);
      });
    }
  } finally {
    await db.$disconnect();
    await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.$disconnect();
  }
});
