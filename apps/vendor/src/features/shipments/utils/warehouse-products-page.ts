import type {
  WarehouseInventoryItem,
  WarehouseProductsPage,
  WarehouseCatalogCategory,
} from "../types/stock-request.types";

export function readWarehouseProductsPage(
  payload: unknown,
  page: number,
  limit: number,
): WarehouseProductsPage {
  if (Array.isArray(payload)) {
    return {
      items: payload as WarehouseInventoryItem[],
      total: payload.length,
      hasMore: false,
    };
  }
  if (typeof payload !== "object" || payload === null) {
    return { items: [], total: 0, hasMore: false };
  }

  const record = payload as Record<string, unknown>;
  const items = Array.isArray(record.items)
    ? (record.items as WarehouseInventoryItem[])
    : [];
  const total = typeof record.total === "number" ? record.total : items.length;
  const hasMore =
    typeof record.hasMore === "boolean" ? record.hasMore : page * limit < total;

  const categories = Array.isArray(record.categories)
    ? record.categories.filter(
        (item: unknown): item is WarehouseCatalogCategory =>
          typeof item === "object" &&
          item !== null &&
          "id" in item &&
          "name" in item &&
          "parentId" in item &&
          "productCount" in item &&
          typeof item.id === "string" &&
          typeof item.name === "string" &&
          (item.parentId === null || typeof item.parentId === "string") &&
          typeof item.productCount === "number",
      )
    : undefined;
  return { items, total, hasMore, categories };
}
