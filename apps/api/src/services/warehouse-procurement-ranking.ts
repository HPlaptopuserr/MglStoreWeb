export interface RankedWarehouseItem {
  productId: string;
  quantity: number;
  physicalQuantity: number;
  reservedQuantity: number;
  outgoingQuantity90d: number;
  product: {
    id: string;
    name: string;
    businessCategory: { id: string; name: string } | null;
    category: { id: string; name: string } | null;
  };
}

export function rankWarehouseProcurement<T extends RankedWarehouseItem>(
  items: T[], categoryId?: string, page = 1,
) {
  const categoryOf = (item: T) => item.product.businessCategory
    ? { id: `business:${item.product.businessCategory.id}`, name: item.product.businessCategory.name }
    : item.product.category
      ? { id: `catalog:${item.product.category.id}`, name: item.product.category.name }
      : { id: 'uncategorized', name: 'Бусад' };
  const eligible = items.filter(item => item.quantity > 0);
  const groups = new Map<string, { id: string; name: string; outgoingQuantity90d: number; productCount: number }>();
  for (const item of eligible) {
    const category = categoryOf(item);
    const group = groups.get(category.id) ?? { ...category, outgoingQuantity90d: 0, productCount: 0 };
    group.outgoingQuantity90d += item.outgoingQuantity90d;
    group.productCount++;
    groups.set(category.id, group);
  }
  const categories = [...groups.values()].sort((a, b) =>
    b.outgoingQuantity90d - a.outgoingQuantity90d || a.name.localeCompare(b.name, "mn") || a.id.localeCompare(b.id)).slice(0, 10);
  const selectedCategoryId = categories.find(category => category.id === categoryId)?.id ?? categories[0]?.id ?? null;
  const ranked = eligible.filter(item => categoryOf(item).id === selectedCategoryId)
    .sort((a, b) => b.outgoingQuantity90d - a.outgoingQuantity90d || a.product.name.localeCompare(b.product.name, "mn") || a.productId.localeCompare(b.productId));
  const offset = (page - 1) * 10;
  return {
    categories, selectedCategoryId, periodDays: 90, total: ranked.length,
    page, hasMore: offset + 10 < ranked.length,
    items: ranked.slice(offset, offset + 10),
  };
}
