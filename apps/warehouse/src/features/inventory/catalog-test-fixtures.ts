import type { InventoryItem } from "./inventory.types";

export function catalogItem(
  id: string,
  overrides: Partial<InventoryItem> = {},
): InventoryItem {
  return {
    id,
    quantity: 5,
    minQuantity: 1,
    maxQuantity: null,
    location: null,
    batchNumber: null,
    expiryDate: null,
    product: {
      id,
      name: `Бараа ${id}`,
      description: null,
      sku: id,
      barcode: null,
      unit: "ш",
      price: "4500",
      costPrice: "3000",
      businessCategoryId: null,
      supplyType: "STOCK",
      preorderLeadTimeDays: null,
      preorderNote: null,
      isActive: true,
      images: [],
    },
    ...overrides,
  };
}
