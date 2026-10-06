import {
  normalizeMasterBarcode,
  normalizeMasterName,
} from "../master-product.service";
import { cleanCatalogUnit } from "../catalog-consolidation/plan";

export interface EnrichmentSource {
  id: string;
  name: string;
  barcode: string | null;
  barcodeAliases: string[];
  unit: string | null;
  masterProductId: string | null;
}
export interface EnrichmentMaster {
  id: string;
  canonicalName: string;
  normalizedName: string;
  barcode: string | null;
  unit: string | null;
  sourceProductId: string | null;
  status: string;
  aliases: { normalizedValue: string }[];
}
export function sourceCodes(source: EnrichmentSource): string[] {
  return [
    ...new Set(
      [source.barcode, ...source.barcodeAliases]
        .map(normalizeMasterBarcode)
        .filter((code): code is string => Boolean(code)),
    ),
  ];
}
// Keep barcode identity separate from searchable name aliases.
export const barcodeAliasKey = (code: string) => `barcode:${code}`;

export type EnrichmentDecision =
  | { action: "create" }
  | { action: "existing"; masterId: string; unitMismatch?: boolean }
  | { action: "skip"; reason: string };

/** Identity wins over spelling: admin edits are never overwritten by imports. */
export function decideEnrichment(
  source: EnrichmentSource,
  masters: EnrichmentMaster[],
): EnrichmentDecision {
  const normalizedName = normalizeMasterName(source.name);
  if (!normalizedName || !/\p{L}/u.test(source.name))
    return {
      action: "skip",
      reason: "Барааны нэр дутуу эсвэл зөвхөн тоо байна",
    };
  const codes = sourceCodes(source);
  const identityMatches = masters.filter(
    (master) =>
      master.id === source.masterProductId ||
      master.sourceProductId === source.id ||
      (master.barcode !== null &&
        codes.includes(normalizeMasterBarcode(master.barcode) ?? "")) ||
      master.aliases.some((alias) =>
        codes.some((code) => barcodeAliasKey(code) === alias.normalizedValue),
      ),
  );
  const matches = identityMatches.length
    ? identityMatches
    : masters.filter(
        (master) =>
          // Different explicit barcodes are distinct products, even with identical names.
          (!codes.length || !master.barcode) &&
          cleanCatalogUnit(master.unit) === cleanCatalogUnit(source.unit) &&
          (master.normalizedName === normalizedName ||
            master.aliases.some(
              (alias) => alias.normalizedValue === normalizedName,
            )),
      );
  if (matches.length > 1)
    return {
      action: "skip",
      reason: "Олон төв бараатай таарч байна; admin тулгаж шалгана уу",
    };
  const match = matches[0];
  if (match) {
    if (match.status !== "ACTIVE")
      return { action: "skip", reason: "Төв санд идэвхгүй бүртгэлтэй байна" };
    return {
      action: "existing",
      masterId: match.id,
      ...(cleanCatalogUnit(match.unit) !== cleanCatalogUnit(source.unit)
        ? { unitMismatch: true }
        : {}),
    };
  }
  return { action: "create" };
}
