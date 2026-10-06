import { prisma } from "@mgl/database";
import {
  createProductSearchScorer,
  normalizeDiscoveryText,
  tokenizeDiscoveryText,
} from "@mgl/types";

interface CatalogSearchEntry {
  id: string;
  canonicalName: string;
  barcode: string | null;
  brand: string | null;
  categoryName: string | null;
  description: string | null;
  aliases: { value: string }[];
}
export function rankMasterCatalog(
  entries: CatalogSearchEntry[],
  search: string,
) {
  if (!search.trim()) return entries.map((entry) => entry.id);
  const score = createProductSearchScorer(search);
  const normalized = normalizeDiscoveryText(search);
  const terms = tokenizeDiscoveryText(search);
  const termScorers = terms.map((term) => ({
    term,
    score: createProductSearchScorer(term),
  }));
  return entries
    .filter((entry) => {
      const identity = [
        entry.canonicalName,
        entry.barcode,
        ...entry.aliases.map((alias) => alias.value),
      ];
      if (
        identity.some(
          (value) => value && normalizeDiscoveryText(value) === normalized,
        )
      )
        return true;
      const product = {
        id: entry.id,
        name: [
          entry.canonicalName,
          ...entry.aliases.map((alias) => alias.value),
        ].join(" "),
        barcode: entry.barcode,
        categoryName: entry.categoryName,
        description: [entry.brand, entry.description].filter(Boolean).join(" "),
      };
      const identityTokens = new Set(
        identity.flatMap((value) =>
          normalizeDiscoveryText(value ?? "").split(" "),
        ),
      );
      // Catalog lookup requires all meaningful terms. Model numbers must match
      // exactly; a lone transliterated letter must not admit unrelated products.
      return termScorers.every(({ term, score: scoreTerm }) =>
        /\d/.test(term) ? identityTokens.has(term) : scoreTerm(product) > 0,
      );
    })
    .map((entry) => ({
      id: entry.id,
      score:
        Math.max(
          score({
            id: entry.id,
            name: entry.canonicalName,
            barcode: entry.barcode,
            categoryName: entry.categoryName,
            description: [entry.brand, entry.description]
              .filter(Boolean)
              .join(" "),
          }),
          ...entry.aliases.map((alias) =>
            score({ id: entry.id, name: alias.value }),
          ),
        ) +
        (normalizeDiscoveryText(entry.canonicalName) === normalized
          ? 100000
          : 0) +
        (entry.barcode && entry.barcode === search.trim() ? 1000000 : 0),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .map((entry) => entry.id);
}
export async function findMasterCatalogIds(search: string) {
  const entries = await prisma.masterProduct.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      canonicalName: true,
      barcode: true,
      brand: true,
      categoryName: true,
      description: true,
      aliases: { select: { value: true } },
    },
    orderBy: [{ canonicalName: "asc" }, { id: "asc" }],
  });
  return rankMasterCatalog(entries, search);
}
