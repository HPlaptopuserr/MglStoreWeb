const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

const migrationDirectory = path.resolve(__dirname, "../prisma/migrations");

function readMigrationFiles(directory = migrationDirectory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        fs.existsSync(path.join(directory, entry.name, "migration.sql")),
    )
    .map((entry) => ({
      name: entry.name,
      checksum: createHash("sha256")
        .update(
          fs.readFileSync(path.join(directory, entry.name, "migration.sql")),
        )
        .digest("hex"),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function inspectMigrationHistory(files, rows) {
  const applied = rows.filter((row) => row.finished_at && !row.rolled_back_at);
  const byName = new Map(files.map((file) => [file.name, file]));
  const counts = new Map();
  for (const row of applied)
    counts.set(row.migration_name, (counts.get(row.migration_name) ?? 0) + 1);
  return {
    files: files.length,
    applied: applied.length,
    pending: files
      .filter((file) => !counts.has(file.name))
      .map((file) => file.name),
    failed: rows
      .filter((row) => !row.finished_at && !row.rolled_back_at)
      .map((row) => row.migration_name),
    changed: applied
      .filter(
        (row) =>
          byName.has(row.migration_name) &&
          byName.get(row.migration_name).checksum !== row.checksum,
      )
      .map((row) => row.migration_name),
    unknown: applied
      .filter((row) => !byName.has(row.migration_name))
      .map((row) => row.migration_name),
    duplicate: [...counts]
      .filter(([, count]) => count > 1)
      .map(([name]) => name),
  };
}

function assertMigrationHistory(report, allowPending = false) {
  const problems = [
    "failed",
    "changed",
    "unknown",
    "duplicate",
    ...(allowPending ? [] : ["pending"]),
  ]
    .filter((kind) => report[kind].length)
    .map((kind) => `${kind}: ${report[kind].join(", ")}`);
  if (problems.length)
    throw new Error(
      `Migration history check failed (${problems.join("; ")}). Refusing release; do not edit applied migrations or auto-baseline production.`,
    );
}

async function auditMigrationHistory({ allowPending = false } = {}) {
  const client = new PrismaClient();
  try {
    const [table] = await client.$queryRaw`SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name = '_prisma_migrations'
    ) AS present`;
    const rows = table.present
      ? await client.$queryRaw`SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations"`
      : [];
    const report = inspectMigrationHistory(readMigrationFiles(), rows);
    console.log(
      `Migration history: ${report.applied}/${report.files} applied; ${report.pending.length} pending; ${report.failed.length} failed; ${report.changed.length} changed.`,
    );
    assertMigrationHistory(report, allowPending);
    return report;
  } finally {
    await client.$disconnect();
  }
}

if (require.main === module) {
  auditMigrationHistory({
    allowPending: process.argv.includes("--allow-pending"),
  }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  readMigrationFiles,
  inspectMigrationHistory,
  assertMigrationHistory,
  auditMigrationHistory,
};
