import { appendFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { prisma, Prisma } from "@mgl/database";
import {
  checkMinuAgentTransaction,
  getMinuAgentToken,
} from "../services/minu-pos-agent";
import {
  classifyLegacyMinuResult,
  planLegacyMinuReview,
} from "../services/minu-legacy-review";

// Read-only by default. --apply-verified records observations and reconciles only
// proven results. Neither mode authorizes, cancels, refunds or creates a sale.
// Run in the API service's authenticated environment; never export credentials.
async function main() {
  const applyVerified = process.argv.includes("--apply-verified");
  let paymentStatusesChanged = 0;
  let concurrentUpdatesSkipped = 0;
  const expectedService = process.argv
    .find((value) => value.startsWith("--service="))
    ?.slice(10);
  const output = process.argv
    .find((value) => value.startsWith("--output="))
    ?.slice(9);
  if (
    !expectedService ||
    process.env.RENDER_SERVICE_ID !== expectedService ||
    !output
  ) {
    throw new Error(
      "Pass --service=<confirmed-service-id> and --output=<private-jsonl-file> inside that Render service",
    );
  }
  const outputPath = output;
  writeFileSync(outputPath, "", { mode: 0o600, flag: "wx" });
  const cutoff = new Date();
  const runId = `minu-legacy-${cutoff.getTime()}`;
  const snapshot = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const attempts = await tx.cardPaymentAttempt.findMany({
        where: {
          consumedAt: null,
          status: { in: ["PENDING", "FAILED"] },
          createdAt: { lte: cutoff },
          providerPayload: { path: ["provider"], equals: "MINU_AGENT" },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
      // Deleted/reassigned registers do not identify the original merchant.
      const organizations = await tx.organization.findMany({
        where: {
          id: {
            in: [
              ...new Set(
                attempts.flatMap((attempt) =>
                  attempt.organizationId ? [attempt.organizationId] : [],
                ),
              ),
            ],
          },
        },
        select: {
          id: true,
          minuAgentUsername: true,
          minuAgentPassword: true,
          minuAgentBranchId: true,
        },
      });
      return { attempts, organizations };
    },
    { timeout: 30_000 },
  );
  const counts: Record<string, number> = {};
  const matrix: Record<string, number> = {};
  const groups = new Map<string, typeof snapshot.attempts>();
  let checked = 0;
  function record(
    attempt: (typeof snapshot.attempts)[number],
    outcome: string,
    details: Prisma.JsonObject = {},
  ) {
    counts[outcome] = (counts[outcome] ?? 0) + 1;
    checked += 1;
    appendFileSync(
      outputPath,
      JSON.stringify({
        runId,
        id: attempt.id,
        organizationId: attempt.organizationId,
        registerId: attempt.registerId,
        terminalId: attempt.terminalId,
        createdAt: attempt.createdAt,
        storedStatus: attempt.status,
        amount: Number(attempt.amount),
        outcome,
        checkedAt: new Date().toISOString(),
        ...details,
      }) + "\n",
    );
    if (checked % 25 === 0)
      console.log(
        JSON.stringify({ event: "progress", runId, checked, counts }),
      );
  }
  for (const attempt of snapshot.attempts) {
    const org = snapshot.organizations.find(
      (organization) => organization.id === attempt.organizationId,
    );
    if (
      !org?.minuAgentUsername ||
      !org.minuAgentPassword ||
      !org.minuAgentBranchId
    ) {
      record(attempt, "CREDENTIALS_UNAVAILABLE");
      continue;
    }
    const group = groups.get(org.id) ?? [];
    group.push(attempt);
    groups.set(org.id, group);
  }
  console.log(
    JSON.stringify({
      event: "start",
      runId,
      total: snapshot.attempts.length,
      readOnly: !applyVerified,
      cutoff,
    }),
  );
  // Serialize each merchant's requests to avoid competing login tokens. Two
  // merchant groups at a time bound bank traffic and API service resource use.
  const queue = [...groups.entries()];
  async function worker() {
    for (let group = queue.shift(); group; group = queue.shift()) {
      const [organizationId, attempts] = group;
      const org = snapshot.organizations.find(
        (organization) => organization.id === organizationId,
      )!;
      const context = {
        username: org.minuAgentUsername!,
        password: org.minuAgentPassword!,
        branchId: org.minuAgentBranchId!,
      };
      try {
        await getMinuAgentToken(context);
      } catch {
        for (const attempt of attempts) record(attempt, "AUTH_UNAVAILABLE");
        continue;
      }
      for (const original of attempts) {
        // Background polling may have changed a row since the initial snapshot.
        // Read before the bank check and use its version for the conditional write.
        const attempt = applyVerified
          ? await prisma.cardPaymentAttempt.findUnique({
              where: { id: original.id },
            })
          : original;
        if (
          !attempt ||
          attempt.consumedAt ||
          attempt.saleReference ||
          !["PENDING", "FAILED"].includes(attempt.status)
        ) {
          record(original, "ALREADY_RESOLVED");
          continue;
        }
        const payload = attempt.providerPayload as Prisma.JsonObject | null;
        const invoice =
          typeof payload?.invoice === "string" ? payload.invoice.trim() : "";
        if (!invoice) {
          record(attempt, "INVOICE_UNAVAILABLE");
          continue;
        }
        try {
          const result = await checkMinuAgentTransaction(context, invoice);
          const terminalId =
            typeof payload?.terminalId === "string" &&
            payload.terminalId !== "terminal-1"
              ? payload.terminalId
              : attempt.terminalId;
          const branchId =
            typeof payload?.branchId === "string"
              ? payload.branchId
              : context.branchId;
          const outcome = classifyLegacyMinuResult({
            invoice,
            branchId,
            result,
          });
          const signature = JSON.stringify([
            result.apiStatus,
            result.terminalStatus,
            String(result.entity?.error ?? ""),
            Boolean(result.entity?.rrn),
            outcome,
          ]);
          matrix[signature] = (matrix[signature] ?? 0) + 1;
          let applied = false;
          if (applyVerified) {
            const plan = planLegacyMinuReview({
              attempt,
              result,
              branchId,
              runId,
              checkedAt: new Date(),
              applyVerified,
            });
            if (plan) {
              const updated = await prisma.cardPaymentAttempt.updateMany(
                plan.args,
              );
              applied = updated.count === 1;
              if (!applied) concurrentUpdatesSkipped += 1;
              else if (plan.statusChanged) paymentStatusesChanged += 1;
            }
          }
          record(attempt, outcome, {
            applied,
            invoice,
            apiStatus: result.apiStatus,
            terminalStatus: result.terminalStatus,
            errorCode: String(result.entity?.error ?? ""),
            hasRrn: Boolean(result.entity?.rrn),
            terminalReferenceMatches:
              !result.entity?.terminalId ||
              result.entity.terminalId === terminalId,
            evidenceHash: createHash("sha256")
              .update(JSON.stringify(result.raw))
              .digest("hex"),
          });
        } catch {
          record(attempt, "CHECK_OR_RECONCILIATION_FAILED", { invoice });
        }
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }
  }
  await Promise.all([worker(), worker()]);
  console.log(
    JSON.stringify({
      event: "complete",
      runId,
      total: snapshot.attempts.length,
      checked,
      counts,
      matrix,
      output,
      readyForDeployment: snapshot.attempts.length === 0,
      paymentStatusesChanged,
      concurrentUpdatesSkipped,
    }),
  );
  // Verification alone does not migrate the old records. Keep deployment gated
  // until proven results are reconciled and ambiguous records are reviewed.
  if (snapshot.attempts.length > 0) process.exitCode = 2;
}
main()
  .catch((error: unknown) => {
    console.error(
      JSON.stringify({
        event: "fatal",
        name: error instanceof Error ? error.name : "UnknownError",
      }),
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
