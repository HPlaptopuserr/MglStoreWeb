import { randomUUID } from "node:crypto";
import type { Prisma } from "@mgl/database";
import type { CatalogCandidate } from "./plan";
import { normalizeMasterName } from "../master-product.service";

// No Product, inventory, price or delete delegate is available to this writer.
export type CatalogWriter = {
  masterProduct: Pick<Prisma.TransactionClient["masterProduct"], "createMany">;
  masterProductAlias: Pick<
    Prisma.TransactionClient["masterProductAlias"],
    "createMany"
  >;
};
export async function applyCatalogPlan(
  writer: CatalogWriter,
  plan: CatalogCandidate[],
) {
  const candidates = plan.filter(candidate => candidate.action === "CREATE");
  const records = candidates.map(candidate => ({ id: randomUUID(), candidate }));
  // Small batches keep network round-trips and transaction duration bounded.
  for (let offset = 0; offset < records.length; offset += 250) {
    const batch = records.slice(offset, offset + 250);
    await writer.masterProduct.createMany({data: batch.map(({id, candidate}) => ({
      id,
      canonicalName: candidate.canonicalName,
      normalizedName: candidate.normalizedName,
      barcode: candidate.barcode,
      unit: candidate.unit,
      categoryName: candidate.categoryName,
      imageUrl: candidate.imageUrl,
      sourceProductId: candidate.sourceIds[0],
      status: "ACTIVE",
    }))});
    const aliases = batch.flatMap(({id, candidate}) => [...new Map(candidate.originalNames.map(value => [normalizeMasterName(value), value])).entries()]
      .filter(([normalizedValue]) => normalizedValue.length > 0)
      .map(([normalizedValue, value]) => ({masterProductId: id, value, normalizedValue})));
    if (aliases.length) await writer.masterProductAlias.createMany({data: aliases, skipDuplicates: true});
  }
  return records.map(({id, candidate}) => ({id, sourceIds: candidate.sourceIds}));
}
