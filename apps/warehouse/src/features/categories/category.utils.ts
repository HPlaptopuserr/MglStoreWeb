import type {
  CategoryLevel,
  WarehouseCategory,
} from "./category.types";

export const CATEGORY_LEVEL_LABELS: Record<CategoryLevel, string> = {
  0: "Үндсэн ангилал",
  1: "Дэд ангилал",
  2: "Sub ангилал",
};

export function normalizeWarehouseCategories(
  payload: unknown,
): WarehouseCategory[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      id: String(item.id || ""),
      name: String(item.name || ""),
      slug: typeof item.slug === "string" ? item.slug : undefined,
      icon: typeof item.icon === "string" ? item.icon : null,
      level: Math.min(2, Math.max(0, Number(item.level) || 0)),
      parentId: typeof item.parentId === "string" ? item.parentId : null,
      productCount:
        typeof item.productCount === "number" ? item.productCount : undefined,
      directProductCount:
        typeof item.directProductCount === "number"
          ? item.directProductCount
          : undefined,
      _count:
        typeof item._count === "object" && item._count !== null
          ? {
              products:
                Number((item._count as { products?: unknown }).products) || 0,
            }
          : undefined,
    }))
    .filter((item) => item.id && item.name)
    .sort(
      (left, right) =>
        left.level - right.level || left.name.localeCompare(right.name, "mn"),
    );
}

export function categoryPath(
  categoryId: string,
  categories: WarehouseCategory[],
): WarehouseCategory[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const path: WarehouseCategory[] = [];
  const visited = new Set<string>();
  let current = byId.get(categoryId);

  while (current && !visited.has(current.id)) {
    path.unshift(current);
    visited.add(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}

export function categoryLabel(
  categoryId: string,
  categories: WarehouseCategory[],
): string {
  return categoryPath(categoryId, categories)
    .map((category) => category.name)
    .join(" › ");
}

export function parentCandidates(
  level: CategoryLevel,
  categories: WarehouseCategory[],
): WarehouseCategory[] {
  if (level === 0) return [];
  return categories.filter((category) => category.level === level - 1);
}

export function categoryMatchesSearch(
  category: WarehouseCategory,
  categories: WarehouseCategory[],
  query: string,
): boolean {
  const normalized = query.trim().toLocaleLowerCase("mn-MN");
  if (!normalized) return true;
  return categoryLabel(category.id, categories)
    .toLocaleLowerCase("mn-MN")
    .includes(normalized);
}
