const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { auditMigrationHistory } = require("./migration-history.cjs");
const { checkRuntimeSchema } = require("./check-runtime-schema.cjs");

const root = path.resolve(__dirname, "../../..");
const schema = path.join(root, "packages/database/prisma/schema.prisma");

function runPrisma(args) {
  const result = spawnSync(
    process.execPath,
    [require.resolve("prisma/build/index.js"), ...args],
    { cwd: root, stdio: "inherit" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const reason =
      args[0] === "migrate" && args[1] === "diff" && result.status === 2
        ? "Production schema differs from the release schema. Review the drift before deploying."
        : `Prisma ${args.slice(0, 2).join(" ")} failed (${result.signal || result.status}).`;
    throw new Error(reason);
  }
}

/** No reconciliation or business-data backfill is inferred during a deployment. */
async function releaseDatabase({
  audit,
  migrate,
  assertSchema,
  assertRuntime,
}) {
  await audit({ allowPending: true });
  await migrate();
  await audit({ allowPending: false });
  await assertSchema();
  await assertRuntime();
}

async function main() {
  await releaseDatabase({
    audit: auditMigrationHistory,
    migrate: () => runPrisma(["migrate", "deploy", "--schema", schema]),
    assertSchema: () =>
      runPrisma([
        "migrate",
        "diff",
        "--from-schema-datasource",
        schema,
        "--to-schema-datamodel",
        schema,
        "--exit-code",
      ]),
    assertRuntime: () => checkRuntimeSchema([]),
  });
  console.log(
    "Database release checks passed: history, migrations, schema drift and all runtime models.",
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { releaseDatabase };
