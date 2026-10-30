const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  readMigrationFiles,
  inspectMigrationHistory,
  assertMigrationHistory,
} = require("./migration-history.cjs");
const files = [
  { name: "001", checksum: "first" },
  { name: "002", checksum: "second" },
];
const applied = (name, checksum) => ({
  migration_name: name,
  checksum,
  finished_at: new Date(),
  rolled_back_at: null,
});

test("new migrations are allowed before deployment and required afterwards", () => {
  const report = inspectMigrationHistory(files, [applied("001", "first")]);
  assert.deepEqual(report.pending, ["002"]);
  assert.doesNotThrow(() => assertMigrationHistory(report, true));
  assert.throws(() => assertMigrationHistory(report), /pending: 002/);
});

test("changed or deleted applied migrations block deployment even with pending migrations allowed", () => {
  const report = inspectMigrationHistory(files, [
    applied("001", "edited"),
    applied("deleted", "old"),
  ]);
  assert.deepEqual(report.changed, ["001"]);
  assert.deepEqual(report.unknown, ["deleted"]);
  assert.throws(
    () => assertMigrationHistory(report, true),
    /changed: 001; unknown: deleted/,
  );
});

test("failed migrations block release; rolled-back attempts do not hide a later successful retry", () => {
  const failed = {
    migration_name: "002",
    checksum: "second",
    finished_at: null,
    rolled_back_at: null,
  };
  assert.throws(
    () =>
      assertMigrationHistory(inspectMigrationHistory(files, [failed]), true),
    /failed: 002/,
  );
  const report = inspectMigrationHistory(files, [
    applied("001", "first"),
    { ...failed, rolled_back_at: new Date() },
    applied("002", "second"),
  ]);
  assert.doesNotThrow(() => assertMigrationHistory(report));
});

test("duplicate successful history records block release", () => {
  const report = inspectMigrationHistory(files, [
    applied("001", "first"),
    applied("001", "first"),
  ]);
  assert.throws(() => assertMigrationHistory(report, true), /duplicate: 001/);
});

test("migration checksums use exact file bytes and ignore non-migration files", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mgl-migrations-"));
  try {
    fs.mkdirSync(path.join(directory, "001"));
    fs.mkdirSync(path.join(directory, "empty"));
    fs.writeFileSync(
      path.join(directory, "migration_lock.toml"),
      "provider = postgresql",
    );
    const file = path.join(directory, "001/migration.sql");
    fs.writeFileSync(file, "SELECT 1;\n");
    const first = readMigrationFiles(directory);
    assert.deepEqual(
      first.map((entry) => entry.name),
      ["001"],
    );
    fs.writeFileSync(file, "SELECT 1;\r\n");
    assert.notEqual(
      readMigrationFiles(directory)[0].checksum,
      first[0].checksum,
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
