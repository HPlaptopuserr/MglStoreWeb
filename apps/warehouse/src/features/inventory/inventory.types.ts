export interface InventoryItem {
  id: string;
  quantity: number;
  minQuantity: number;
  maxQuantity: number | null;
  location: string | null;
  batchNumber: string | null;
  expiryDate: string | null;
  note?: string | null;
  product: {
    id: string;
    name: string;
    description: string | null;
    sku: string | null;
    barcode: string | null;
    unit: string | null;
    price: string;
    costPrice: string | null;
    businessCategoryId: string | null;
    supplyType: string;
    preorderLeadTimeDays: number | null;
    preorderNote: string | null;
    isActive: boolean;
    images: { id: string; url: string }[];
  };
}

export type StockStatus = "all" | "healthy" | "low" | "out";

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  all: "Бүгд",
  healthy: "Хэвийн",
  low: "Дутагдал",
  out: "Дууссан",
};

export function getInventoryStockStatus(
  item: Pick<InventoryItem, "quantity" | "minQuantity">,
): Exclude<StockStatus, "all"> {
  if (item.quantity === 0) return "out";
  return item.quantity <= item.minQuantity ? "low" : "healthy";
}

export interface InventorySummary {
  total: number;
  healthy: number;
  low: number;
  out: number;
  totalStock: number;
  located: number;
}

export interface InventoryFilters {
  warehouseId: string;
  search: string;
  status: StockStatus;
}

export interface InventoryResponse {
  inventory: InventoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: InventorySummary;
}
