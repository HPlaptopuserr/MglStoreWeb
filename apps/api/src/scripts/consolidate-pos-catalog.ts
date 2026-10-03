import { Prisma, PrismaClient } from "@prisma/client";
let prisma: PrismaClient;
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { createInterface } from "node:readline";
import {
  planCatalogConsolidation,
  type CatalogSource,
} from "../services/catalog-consolidation/plan";
import { applyCatalogPlan } from "../services/catalog-consolidation/apply";

const args = process.argv.slice(2);
const outputIndex = args.indexOf("--output-dir");
const outputDir = outputIndex >= 0 ? args[outputIndex + 1] : undefined;
const apply = args.includes("--apply");
const stdinConnection = args.includes("--connection-stdin");
const masterSelect = {
  id: true,
  canonicalName: true,
  barcode: true,
  unit: true,
  sourceProductId: true,
  status: true,
} as const;

async function main() {
  if (!outputDir) throw new Error("OUTPUT_DIRECTORY_REQUIRED");
  if (stdinConnection) {
    const input = createInterface({ input: process.stdin, terminal: false });
    const connection = await new Promise<string>((accept, reject) => {
      input.once("line", accept);
      input.once("close", () => reject(new Error("CONNECTION_REQUIRED")));
    });
    input.close();
    const url = new URL(connection.trim());
    if (!["postgres:", "postgresql:"].includes(url.protocol))
      throw new Error("INVALID_CONNECTION_TYPE");
    url.searchParams.set("sslmode", "require");
    url.searchParams.set("connection_limit", "2");
    url.searchParams.set("connect_timeout", "15");
    process.env.DATABASE_URL = url.toString();
  }
  if (!process.env.DATABASE_URL) throw new Error("CONNECTION_REQUIRED");
  prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } }, log: [] });
  // One consistent, read-only snapshot. No source write is possible in this transaction.
  const snapshot = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const settings = await tx.siteSetting.findMany({
        where: { key: { startsWith: "pos-enabled-" }, value: "true" },
        select: { key: true },
      });
      const enabledIds = settings.map((setting) =>
        setting.key.slice("pos-enabled-".length),
      );
      const stores = await tx.organization.findMany({
        where: {
          deletedAt: null,
          OR: [
            { id: { in: enabledIds } },
            { posRegisters: { some: { isActive: true } } },
            { posSales: { some: {} } },
          ],
        },
        select: { id: true, name: true, status: true },
        orderBy: { id: "asc" },
      });
      const products = await tx.product.findMany({
        where: {
          organizationId: { in: stores.map((store) => store.id) },
          deletedAt: null,
        },
        select: {
          id: true,
          organizationId: true,
          name: true,
          barcode: true,
          unit: true,
          description: true,
          masterProductId: true,
          isActive: true,
          isRestaurantMenuItem: true,
          reviewStatus: true,
          updatedAt: true,
          stock: true,
          price: true,
          costPrice: true,
          category: { select: { name: true } },
          businessCategory: { select: { name: true } },
          images: { select: { url: true }, orderBy: { id: "asc" }, take: 1 },
          warehouseInventories: {
            select: { warehouseId: true, quantity: true },
          },
        },
        orderBy: { id: "asc" },
      });
      const masters = await tx.masterProduct.findMany({
        select: masterSelect,
        orderBy: { id: "asc" },
      });
      return {
        capturedAt: new Date().toISOString(),
        stores,
        products,
        masters,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      timeout: 120000,
    },
  );
  const sources: CatalogSource[] = snapshot.products.filter(
    (product): product is typeof product & { organizationId: string } => product.organizationId !== null,
  ).map((product) => ({
    id: product.id,
    organizationId: product.organizationId,
    name: product.name,
    barcode: product.barcode,
    unit: product.unit,
    masterProductId: product.masterProductId,
    isActive: product.isActive,
    isRestaurantMenuItem: product.isRestaurantMenuItem,
    reviewStatus: product.reviewStatus,
    updatedAt: product.updatedAt.toISOString(),
    categoryName:
      product.businessCategory?.name ?? product.category?.name ?? null,
    imageUrl: product.images[0]?.url ?? null,
  }));
  const plan = planCatalogConsolidation(sources, snapshot.masters);
  const serializedSnapshot = JSON.stringify(snapshot, null, 2);
  const digest = createHash("sha256").update(serializedSnapshot).digest("hex");
  const runDir = resolve(
    outputDir,
    new Date().toISOString().replace(/[:.]/g, "-"),
  );
  await mkdir(runDir, { recursive: true, mode: 0o700 });
  async function save(name: string, value: unknown) {
    await writeFile(resolve(runDir, name), JSON.stringify(value, null, 2), {
      mode: 0o600,
      flag: "wx",
    });
  }
  await save("source-snapshot.json", snapshot);
  await save("consolidation-plan.json", {
    snapshotSha256: digest,
    candidates: plan,
  });
  await save(
    "needs-review.json",
    plan.filter((candidate) => candidate.action === "REVIEW"),
  );
  const sourceNames = new Map(plan.flatMap(candidate => candidate.sourceIds.map(id => [id, candidate.canonicalName] as const)));
  const counts = {
    stores: snapshot.stores.length,
    sourceProducts: sources.length,
    existingMasters: snapshot.masters.length,
    candidates: plan.length,
    readyToCreate: plan.filter((candidate) => candidate.action === "CREATE")
      .length,
    alreadyPresent: plan.filter((candidate) => candidate.action === "EXISTS")
      .length,
    needsReview: plan.filter((candidate) => candidate.action === "REVIEW")
      .length,
    cosmeticNameChanges: sources.filter(
      (source) =>
        sourceNames.get(source.id) !== source.name,
    ).length,
  };
  let created: Array<{ id: string; sourceIds: string[] }> = [];
  if (apply) {
    created = await prisma.$transaction(
      async (tx) => {
        // A source may have changed after extraction; stop instead of applying stale data.
        const current = await tx.product.findMany({
          where: { id: { in: sources.map((source) => source.id) } },
          select: { id: true, updatedAt: true, deletedAt: true },
        });
        const versions = new Map(
          sources.map((source) => [source.id, source.updatedAt]),
        );
        if (
          current.length !== sources.length ||
          current.some(
            (item) =>
              item.deletedAt ||
              item.updatedAt.toISOString() !== versions.get(item.id),
          )
        )
          throw new Error("SOURCE_CHANGED_RETRY_REQUIRED");
        const currentMasters = await tx.masterProduct.findMany({
          select: masterSelect,
        });
        const currentPlan = planCatalogConsolidation(sources, currentMasters);
        // Narrow writer only exposes MasterProduct.createMany and MasterProductAlias.createMany.
        return applyCatalogPlan(
          {
            masterProduct: tx.masterProduct,
            masterProductAlias: tx.masterProductAlias,
          },
          currentPlan,
        );
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 120000,
      },
    );
    await save("created-masters.json", created);
  }
  await save("summary.json", {
    mode: apply ? "APPLY" : "DRY_RUN",
    ...counts,
    createdMasters: created.length,
    snapshotSha256: digest,
    sourceWrites: 0,
  });
  console.log(
    JSON.stringify(
      {
        mode: apply ? "APPLY" : "DRY_RUN",
        ...counts,
        createdMasters: created.length,
        sourceWrites: 0,
        reportDirectory: runDir,
      },
      null,
      2,
    ),
  );
}
main()
  .catch((error: unknown) => {
    // Never echo a URL, password, Prisma connection message, or full error object.
    const code =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.code
        : error instanceof Error && /^[A-Z_]+$/.test(error.message)
          ? error.message
          : "CATALOG_OPERATION_FAILED";
    console.error(JSON.stringify({ error: code }));
    process.exitCode = 1;
  })
  .finally(() => prisma?.$disconnect());
