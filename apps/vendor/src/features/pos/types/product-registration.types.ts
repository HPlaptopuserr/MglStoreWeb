export interface SharedCatalogSuggestion {
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

export interface QuickProductRegistrationInput {
  organizationId: string;
  masterProductId: string | null;
  name: string;
  barcode: string;
  price: number;
  costPrice: number | null;
  stock: number;
  imageUrl: string | null;
  unit: string | null;
  description: string | null;
  businessCategoryId: string | null;
  suggestedSku: string | null;
  taxType: SharedCatalogSuggestion["taxType"];
  cityTaxRate: number | null;
  classificationCode: string | null;
  taxProductCode: string | null;
}
