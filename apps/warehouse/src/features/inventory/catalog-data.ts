import type { InventoryItem } from "./inventory.types";

export interface CatalogGroup {
  name: string;
  items: InventoryItem[];
}

export function groupCatalogItems(
  items: InventoryItem[],
  inStockOnly: boolean,
): CatalogGroup[] {
  const groups = new Map<string, InventoryItem[]>();
  for (const item of items) {
    if (!item.product.isActive || (inStockOnly && item.quantity <= 0)) continue;
    const category = item.product.businessCategory;
    const name = category
      ? [category.parent?.name, category.name].filter(Boolean).join(" / ")
      : "Ангилалгүй";
    const group = groups.get(name) ?? [];
    group.push(item);
    groups.set(name, group);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "mn"))
    .map(([name, group]) => ({
      name,
      items: group.sort((left, right) =>
        left.product.name.localeCompare(right.product.name, "mn"),
      ),
    }));
}
