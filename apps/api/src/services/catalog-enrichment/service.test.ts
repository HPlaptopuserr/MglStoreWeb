import assert from "node:assert/strict";
import test from "node:test";
import {
  enrichCatalogBatch,
  enrichMasterCatalog,
  parseEnrichmentRequest,
} from "./service";
import type { EnrichmentMaster } from "./policy";
import { Prisma } from "@mgl/database";

const date = new Date("2026-10-06T00:00:00.000Z");
test("continuation requires a valid cursor and stable cutoff", () => {
  assert.deepEqual(parseEnrichmentRequest({}, date), {
    cursor: undefined,
    startedAt: date,
  });
  for (const body of [
    null,
    [],
    { cursor: "x" },
    { cursor: "bad value", startedAt: date.toISOString() },
    { startedAt: "bad" },
    { startedAt: "2099-01-01" },
  ])
    assert.throws(() => parseEnrichmentRequest(body, date));
});

test("all 526 vendor/warehouse records are scanned in bounded batches and reruns do not duplicate", async () => {
  const sources = Array.from({ length: 526 }, (_, index) => ({
    id: `p-${String(index).padStart(4, "0")}`,
    name: `Product ${Math.floor(index / 2)}`,
    barcode: `code-${Math.floor(index / 2)}`,
    barcodeAliases: [] as string[],
    unit: "pcs",
    masterProductId: null,
    description: "Description",
    managedByWarehouseId: index % 2 ? "warehouse" : null,
    warehouseInventories: index % 2 ? [{ id: "inventory" }] : [],
    businessCategory: null,
    category: { name: "Category" },
    images: [{ url: "https://example.com/product.png" }],
  }));
  sources[1].barcodeAliases = ["code-1"];
  sources[1].unit = "kg";
  sources[1].name = "USB cable CA-8854 C-iphone";
  const masters: EnrichmentMaster[] = [];
  // No Product write delegates exist in this fake: enrichment must be central-only.
  const tx = {
    product: {
      count: async ({ where }: { where: Prisma.ProductWhereInput }) => {
        assert.deepEqual(where, { deletedAt: null, createdAt: { lte: date } });
        return sources.length;
      },
      findMany: async ({
        where,
        take,
      }: {
        where: { id?: { gt: string } };
        take: number;
      }) => {
        assert.equal(take, 26);
        return sources
          .filter((source) => !where.id || source.id > where.id.gt)
          .slice(0, take);
      },
    },
    masterProductAlias: {
      createMany: async ({
        data,
      }: {
        data: { masterProductId: string; normalizedValue: string }[];
      }) => {
        for (const alias of data) {
          const master = masters.find(
            (item) => item.id === alias.masterProductId,
          );
          if (
            master &&
            !master.aliases.some(
              (item) => item.normalizedValue === alias.normalizedValue,
            )
          )
            master.aliases.push(alias);
        }
      },
    },
    masterProduct: {
      findMany: async () => masters,
      create: async ({
        data,
      }: {
        data: {
          canonicalName: string;
          normalizedName: string;
          barcode: string;
          unit: string;
          sourceProductId: string;
          aliases: { create: { normalizedValue: string }[] };
        };
      }) => {
        masters.push({
          ...data,
          id: `master-${masters.length}`,
          status: "ACTIVE",
          aliases: data.aliases.create,
        });
      },
    },
  } as unknown as Parameters<typeof enrichCatalogBatch>[0];
  for (const expectedCreated of [262, 0]) {
    let unitDifferences = 0;
    let cursor: string | undefined;
    let processed = 0,
      created = 0,
      warehouseProducts = 0;
    do {
      const batch = await enrichCatalogBatch(tx, { cursor, startedAt: date });
      unitDifferences += batch.unitDifferences;
      processed += batch.processed;
      created += batch.created;
      warehouseProducts += batch.warehouseProducts;
      cursor = batch.nextCursor ?? undefined;
    } while (cursor);
    assert.equal(unitDifferences, 1);
    assert.equal(processed, 526);
    assert.equal(created, expectedCreated);
    assert.equal(warehouseProducts, 263);
  }
  assert.equal(masters.length, 262);
  assert.equal(masters[0].unit, "pcs");
  assert.ok(
    masters[0].aliases.some(
      (alias) => alias.normalizedValue === "usb cable ca 8854 c iphone",
    ),
  );
  assert.equal(
    masters.some((master) => master.barcode === "code-1"),
    false,
  );
});

function databaseWithTransaction(
  run: (
    operation: (tx: Prisma.TransactionClient) => Promise<unknown>,
  ) => Promise<unknown>,
) {
  return { $transaction: run } as unknown as NonNullable<
    Parameters<typeof enrichMasterCatalog>[1]
  >;
}
const emptyTransaction = (acquired: boolean) =>
  ({
    $queryRaw: async () => [{ acquired }],
    product: { count: async () => 0, findMany: async () => [] },
  }) as unknown as Prisma.TransactionClient;

test("concurrent admin lock rejection performs no catalog writes", async () => {
  await assert.rejects(
    enrichMasterCatalog(
      {},
      databaseWithTransaction((run) => run(emptyTransaction(false))),
    ),
    /Өөр admin/,
  );
});

test("serialization and barcode races retry the whole transaction, bounded to three attempts", async () => {
  for (const code of ["P2034", "P2002"]) {
    let attempts = 0;
    const database = databaseWithTransaction(async (run) => {
      if (++attempts < 3)
        throw new Prisma.PrismaClientKnownRequestError("race", {
          code,
          clientVersion: "test",
        });
      return run(emptyTransaction(true));
    });
    const result = await enrichMasterCatalog({}, database);
    assert.equal(attempts, 3);
    assert.equal(result.processed, 0);
    attempts = 0;
    await assert.rejects(
      enrichMasterCatalog(
        {},
        databaseWithTransaction(async () => {
          attempts++;
          throw new Prisma.PrismaClientKnownRequestError("race", {
            code,
            clientVersion: "test",
          });
        }),
      ),
    );
    assert.equal(attempts, 3);
  }
});

test("unexpected database failures stop without hiding the error", async () => {
  let attempts = 0;
  await assert.rejects(
    enrichMasterCatalog(
      {},
      databaseWithTransaction(async () => {
        attempts++;
        throw new Error("offline");
      }),
    ),
    /offline/,
  );
  assert.equal(attempts, 1);
});
