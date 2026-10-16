import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import {
  parseStagingManifest,
  planStaging,
} from "../services/platform-accounts/staging";

/**
 * Default: read-only audit. Does not load .env or select a database implicitly.
 * Apply is deliberately local-only in this preparation release.
 * Example: pnpm exec tsx src/scripts/stage-platform-accounts.ts manifest.json
 */
async function main(): Promise<void> {
  const [manifestPath, ...options] = process.argv.slice(2);
  if (!manifestPath || options.some((option) => option !== "--apply-local")) {
    throw new Error(
      "Usage: stage-platform-accounts.ts manifest.json [--apply-local]",
    );
  }
  const manifest = parseStagingManifest(
    JSON.parse(await readFile(manifestPath, "utf8")) as unknown,
  );
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL must be explicitly supplied");
  const target = new URL(databaseUrl);
  const apply = options.includes("--apply-local");
  if (
    apply &&
    (process.env.NODE_ENV === "production" ||
      !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) ||
      process.env.PLATFORM_ACCOUNT_STAGING_LOCAL !== "true")
  ) {
    throw new Error(
      "Writes require a local test database and PLATFORM_ACCOUNT_STAGING_LOCAL=true",
    );
  }
  const prisma = new PrismaClient({ log: [] });
  try {
    const summary = await prisma.$transaction(
      async (tx) => {
        if (!apply) await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
        const totals = {
          mode: apply ? "local-apply" : "dry-run",
          users: 0,
          planned: 0,
          existing: 0,
          stale: 0,
        };
        // Stable lock order also prevents password changes during an apply batch.
        for (const entry of [...manifest].sort((a, b) =>
          a.userId.localeCompare(b.userId),
        )) {
          if (apply) {
            await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${entry.userId} FOR UPDATE`;
          }
          const user = await tx.user.findUnique({
            where: { id: entry.userId },
            select: {
              id: true,
              isActive: true,
              deletedAt: true,
              passwordHash: true,
              platformAccounts: {
                select: { platform: true, passwordHash: true, status: true },
              },
            },
          });
          if (!user) throw new Error("Manifest includes a missing user");
          const plan = planStaging(
            user,
            entry.platforms,
            user.platformAccounts,
          );
          totals.users += 1;
          totals.planned += plan.inserts.length;
          totals.existing += plan.existing;
          totals.stale += plan.stale;
          if (apply && plan.stale > 0) {
            throw new Error(
              "Staged credentials have drifted; reconcile before retrying",
            );
          }
          if (apply && plan.inserts.length > 0) {
            await tx.platformAccount.createMany({
              data: plan.inserts.map((insert) => ({
                ...insert,
                status: "STAGED",
                migratedAt: new Date(),
              })),
            });
          }
        }
        return totals;
      },
      { isolationLevel: "Serializable", timeout: 60_000 },
    );
    // Only aggregate counts. Never log usernames, password hashes or URLs.
    console.log(JSON.stringify(summary));
    if (summary.stale > 0) process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  // ORM exceptions can contain connection details and query parameters.
  console.error(
    "Platform account staging did not complete successfully. Check manifest, local database, schema and credential drift; use dry-run to verify state before retrying.",
  );
  process.exitCode = 1;
});
