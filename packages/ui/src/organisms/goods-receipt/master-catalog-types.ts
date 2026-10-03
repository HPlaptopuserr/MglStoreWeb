export interface MasterCatalogProduct {
  id: string;
  canonicalName: string;
  barcode: string | null;
  brand: string | null;
  unit: string | null;
  description: string | null;
  imageUrl: string | null;
  categoryName: string | null;
  businessCategoryId: string | null;
  suggestedSku: string | null;
  suggestedPrice: number | null;
  taxType: "VAT_ABLE" | "VAT_FREE" | "VAT_ZERO" | "NOT_VAT" | null;
  cityTaxRate: number | null;
  classificationCode: string | null;
  taxProductCode: string | null;
  sourceCompleteness: number;
  usageCount: number;
  exactBarcodeMatch: boolean;
}
