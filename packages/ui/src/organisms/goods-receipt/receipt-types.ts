import type { PosMeasureUnit } from "@mgl/types";
export type ProductOption = {
  id: string;
  masterProductId?: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  stock: number;
  costPrice?: number | null;
  price?: number;
  manualReceiptPrice?: string;
  unit?: PosMeasureUnit | string | null;
  isActive?: boolean;
  supplyType?: string;
};

export type ReceiptLine = {
  id: string;
  product: ProductOption;
  quantity: number;
  unitCost: string;
  salePrice: string;
  manualPrice: boolean;
  batchNumber: string;
  expiryDate: string;
};
