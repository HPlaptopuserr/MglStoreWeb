export interface ProductImage {
  id: string;
  url: string;
}

export interface BusinessCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  level: number;
  children?: BusinessCategory[];
}

export interface ProductReceiptLot {
  id: string;
  quantity: number;
  remainingQuantity: number;
  batchNumber: string | null;
  expiryDate: string | null;
  receiptNo: string;
  supplierName: string;
  receivedAt: string;
  branchName: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  price: number;
  wholesalePrice: number | null;
  orderPrice: number | null;
  costPrice: number | null;
  taxType: "VAT_ABLE" | "VAT_FREE" | "VAT_ZERO" | "NOT_VAT";
  cityTaxRate: number;
  classificationCode: string;
  taxProductCode: string | null;
  stock: number;
  expiryDate?: string | null;
  receiptLots?: ProductReceiptLot[];
  supplyType: "IN_STOCK" | "CHINA_PREORDER";
  preorderLeadTimeDays: number | null;
  preorderCapacity: number | null;
  preorderParticipantCount?: number;
  preorderRemaining?: number | null;
  preorderIsFull?: boolean;
  preorderSupplierFrontImageUrl: string | null;
  preorderSupplierBackImageUrl: string | null;
  preorderNote: string | null;
  preorderPriceCurrency: PreorderCurrency | null;
  preorderPriceAmount: number | null;
  preorderExchangeRate: number | null;
  preorderMarkupPercent: number | null;
  preorderRateSource: string | null;
  preorderRateFetchedAt: string | null;
  marketplacePriority: number;
  isActive: boolean;
  images: ProductImage[];
  businessCategoryId: string | null;
  businessCategory: { id: string; name: string } | null;
  createdAt: string;
}

export interface FormState {
  masterProductId: string;
  name: string;
  sku: string;
  barcode: string;
  description: string;
  price: string;
  wholesalePrice: string;
  orderPrice: string;
  costPrice: string;
  taxType: "VAT_ABLE" | "VAT_FREE" | "VAT_ZERO" | "NOT_VAT";
  cityTaxRate: string;
  classificationCode: string;
  taxProductCode: string;
  stock: string;
  expiryDate: string;
  supplyType: "IN_STOCK" | "CHINA_PREORDER";
  preorderLeadTimeDays: string;
  preorderCapacity: string;
  preorderSupplierFrontImageUrl: string;
  preorderSupplierBackImageUrl: string;
  preorderNote: string;
  preorderPriceCurrency: PreorderCurrency;
  marketplacePriority: string;
  businessCategoryId: string;
  images: string[];
}

export type PreorderCurrency = "MNT" | "USD" | "CNY" | "KRW" | "JPY";

export interface MasterCatalogProduct {
  id: string;
  canonicalName: string;
  barcode: string | null;
  brand: string | null;
  unit: string | null;
  description: string | null;
  imageUrl: string | null;
  categoryName: string | null;
  usageCount: number;
  exactBarcodeMatch: boolean;
}

export interface PlanStatus {
  isActive: boolean;
  planType: string | null;
  planExpiresAt: string | null;
  trialUsed: boolean;
  currentPlan: { maxProducts: number; name: string; isTrial: boolean } | null;
}
