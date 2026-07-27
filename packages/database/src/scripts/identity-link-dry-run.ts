import { prisma } from "../client";
import { createIdentityLinkDryRunReport } from "../identity/identity-link-report";

async function main(): Promise<void> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      emailVerified: true,
      identitySubject: true,
      isActive: true,
      deletedAt: true
    },
    orderBy: { id: "asc" }
  });

  const report = createIdentityLinkDryRunReport(users);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    process.stderr.write(`Identity link dry-run failed: ${message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
