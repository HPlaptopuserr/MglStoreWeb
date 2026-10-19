import type {
  PreorderCurrency,
  QuickProductSupplyType,
} from "./quick-product.types";

export type ManagedProduct = {
  id: string;
  name: string;
  sku?: string | null;
  isActive?: boolean;
  unit?: string | null;
  description?: string | null;
  price?: number | string | null;
  stock?: number | null;
  supplyType?: QuickProductSupplyType | null;
  preorderPriceCurrency?: PreorderCurrency | null;
  preorderPriceAmount?: number | string | null;
  preorderLeadTimeDays?: number | null;
  preorderCapacity?: number | null;
  preorderNote?: string | null;
  images?: Array<{ url?: string | null }>;
  createdAt?: string | Date;
};
