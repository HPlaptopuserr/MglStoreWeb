import { Prisma, prisma } from "@mgl/database";
import { productImageOrderBy } from "../../lib/product-images";
import { CatalogEditError } from "../master-catalog-editor.service";
import { normalizeMasterName } from "../master-product.service";
import { barcodeAliasKey, decideEnrichment, sourceCodes } from "./policy";

const BATCH_SIZE = 25;
export function parseEnrichmentRequest(body: unknown, now = new Date()) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new CatalogEditError(400, "Хүсэлтийн бүтэц буруу байна");
  const input = body as Record<string, unknown>;
  const cursor = input.cursor;
  if (
    cursor !== undefined &&
    (typeof cursor !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(cursor))
  )
    throw new CatalogEditError(400, "Тулгалтын үргэлжлүүлэх код буруу байна");
  if (cursor && !input.startedAt)
    throw new CatalogEditError(400, "Тулгалтын эхлэх хугацаа шаардлагатай");
  const startedAt =
    input.startedAt === undefined
      ? now
      : typeof input.startedAt === "string"
        ? new Date(input.startedAt)
        : new Date(NaN);
  if (!Number.isFinite(startedAt.getTime()) || startedAt > now)
    throw new CatalogEditError(400, "Тулгалтын эхлэх хугацаа буруу байна");
  return { cursor: cursor as string | undefined, startedAt };
}
export async function enrichMasterCatalog(
  body: unknown,
  database: Pick<typeof prisma, "$transaction"> = prisma,
) {
  const { cursor, startedAt } = parseEnrichmentRequest(body);
  for (let attempt = 0; ; attempt++) {
    try {
      return await database.$transaction(
        async (tx) => {
          // Serialize admin batches across API instances. Normal product creation is
          // additionally protected by serializable retries and the barcode unique key.
          const locks = await tx.$queryRaw<{ acquired: boolean }[]>`
          SELECT pg_try_advisory_xact_lock(724193021) AS acquired`;
          if (!locks[0]?.acquired)
            throw new CatalogEditError(
              409,
              "Өөр admin сан шинэчилж байна. Түр хүлээгээд дахин оролдоно уу.",
            );
          return enrichCatalogBatch(tx, { cursor, startedAt });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 25_000,
          maxWait: 5_000,
        },
      );
    } catch (error: unknown) {
      if (
        attempt < 2 &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2034", "P2002"].includes(error.code)
      )
        continue;
      throw error;
    }
  }
}

export async function enrichCatalogBatch(
  tx: Pick<
    Prisma.TransactionClient,
    "product" | "masterProduct" | "masterProductAlias"
  >,
  { cursor, startedAt }: ReturnType<typeof parseEnrichmentRequest>,
) {
  // Product is shared by vendor catalogs AND warehouse-managed inventory.
  // Include sold-out/inactive products; stock and online visibility are irrelevant.
  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
    createdAt: { lte: startedAt },
  };
  const [total, rows] = await Promise.all([
    tx.product.count({ where }),
    tx.product.findMany({
      where: { ...where, ...(cursor ? { id: { gt: cursor } } : {}) },
      orderBy: { id: "asc" },
      take: BATCH_SIZE + 1,
      select: {
        id: true,
        name: true,
        barcode: true,
        barcodeAliases: true,
        unit: true,
        masterProductId: true,
        description: true,
        managedByWarehouseId: true,
        warehouseInventories: { take: 1, select: { id: true } },
        businessCategory: { select: { name: true } },
        category: { select: { name: true } },
        images: {
          take: 1,
          orderBy: productImageOrderBy(),
          select: { url: true },
        },
      },
    }),
  ]);
  const batch = rows.slice(0, BATCH_SIZE);
  const result = {
    total,
    processed: batch.length,
    created: 0,
    existing: 0,
    skipped: 0,
    warehouseProducts: 0,
    unitDifferences: 0,
    issues: [] as { productId: string; name: string; reason: string }[],
    startedAt: startedAt.toISOString(),
    nextCursor: rows.length > BATCH_SIZE ? batch[batch.length - 1].id : null,
  };
  for (const source of batch) {
    if (source.managedByWarehouseId || source.warehouseInventories.length)
      result.warehouseProducts++;
    const codes = sourceCodes(source);
    const normalizedName = normalizeMasterName(source.name);
    const masters = await tx.masterProduct.findMany({
      where: {
        OR: [
          { sourceProductId: source.id },
          ...(source.masterProductId ? [{ id: source.masterProductId }] : []),
          ...(codes.length
            ? [{ barcode: { in: codes, mode: "insensitive" as const } }]
            : []),
          { normalizedName },
          {
            aliases: {
              some: {
                normalizedValue: {
                  in: [normalizedName, ...codes.map(barcodeAliasKey)],
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        canonicalName: true,
        normalizedName: true,
        barcode: true,
        unit: true,
        sourceProductId: true,
        status: true,
        aliases: { select: { normalizedValue: true } },
      },
    });
    const decision = decideEnrichment(source, masters);
    if (decision.action === "skip") {
      result.skipped++;
      result.issues.push({
        productId: source.id,
        name: source.name,
        reason: decision.reason,
      });
    } else if (decision.action === "existing") {
      // Preserve new alternate codes even when this product already exists. A
      // later vendor may know only this code; keeping it prevents chain duplicates.
      await tx.masterProductAlias.createMany({
        data: [
          {
            masterProductId: decision.masterId,
            value: source.name.trim(),
            normalizedValue: normalizedName,
          },
          ...codes.map((code) => ({
            masterProductId: decision.masterId,
            value: code,
            normalizedValue: barcodeAliasKey(code),
          })),
        ],
        skipDuplicates: true,
      });
      result.existing++;
      if (decision.unitMismatch) result.unitDifferences++;
    } else {
      await tx.masterProduct.create({
        data: {
          canonicalName: source.name.trim(),
          normalizedName,
          barcode: codes[0] ?? null,
          unit: source.unit,
          description: source.description,
          imageUrl: source.images[0]?.url ?? null,
          categoryName:
            source.businessCategory?.name ?? source.category?.name ?? null,
          sourceProductId: source.id,
          aliases: {
            create: [
              { value: source.name.trim(), normalizedValue: normalizedName },
              ...codes.map((value) => ({
                value,
                normalizedValue: barcodeAliasKey(value),
              })),
            ],
          },
        },
      });
      result.created++;
    }
  }
  return result;
}
