interface OnlineProductStock {
  managedByWarehouseId: string | null;
  stock: number;
  warehouseInventories: ReadonlyArray<{ warehouseId: string; quantity: number }>;
}

/** Centrally managed products must be fulfilled by their managing warehouse. */
export function onlineProductStock(product: OnlineProductStock): number {
  if (product.managedByWarehouseId) {
    return Math.max(0, product.warehouseInventories.find(row => row.warehouseId === product.managedByWarehouseId)?.quantity ?? 0);
  }
  return product.warehouseInventories.length
    ? product.warehouseInventories.reduce((total, row) => total + Math.max(0, row.quantity), 0)
    : product.stock;
}
