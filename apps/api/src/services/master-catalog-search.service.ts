import { prisma } from "@mgl/database";
import { createProductSearchScorer } from "@mgl/types";

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
  return entries
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
        ) + (entry.barcode && entry.barcode === search.trim() ? 10000 : 0),
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
