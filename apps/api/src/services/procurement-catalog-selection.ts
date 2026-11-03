interface ProcurementCatalogItem {
  quantity: number;
  soldQuantity90d: number;
  systemSoldQuantity90d?: number;
  systemRequestedQuantity90d?: number;
  previouslyRequestedQuantity: number;
  outgoingQuantity90d: number;
  reorderPoint: number;
  organizationStock: number;
  recommendationReason: string | null;
}

/** Personal demand first; a new store can still browse and order warehouse stock. */
export function selectProcurementCatalog<T extends ProcurementCatalogItem>(
  inventory: T[], sort: string, lowStockOnly: boolean, preferOwn = true,
): { items: T[]; source: 'store' | 'warehouse' | 'catalog' } {
  const ready = inventory.filter(item => item.quantity > 0);
  const fallback = () => ({
    source: ready.some(item => item.outgoingQuantity90d > 0) ? 'warehouse' as const : 'catalog' as const,
    items: ready.map(item => ({ ...item,
      recommendationReason: item.outgoingQuantity90d > 0 ? 'WAREHOUSE_POPULAR' : 'AVAILABLE_STOCK',
    })),
  });
  const candidates = preferOwn ? ready : inventory;
  let own = lowStockOnly
    ? candidates.filter(item => item.reorderPoint > 0 && item.organizationStock < item.reorderPoint)
    : candidates;
  if (sort === 'recommended') own = own.filter(item => item.recommendationReason !== null);
  else if (sort === 'topSelling') own = own.filter(item => (preferOwn ? item.soldQuantity90d : item.systemSoldQuantity90d ?? 0) > 0);
  else if (sort === 'previouslyOrdered') own = own.filter(item => item.previouslyRequestedQuantity > 0);
  else if (sort === 'mostRequested') {
    if (preferOwn) return fallback();
    own = own.filter(item => (item.systemRequestedQuantity90d ?? 0) > 0);
  }
  if (preferOwn && own.length === 0 && (lowStockOnly || sort !== 'name')) return fallback();
  // The normal catalog keeps sold-out rows visible as before.
  return { items: sort === 'name' && !lowStockOnly ? inventory : own, source: 'store' };
}
