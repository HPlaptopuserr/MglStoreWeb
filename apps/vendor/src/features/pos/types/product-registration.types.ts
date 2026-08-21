export interface SharedCatalogSuggestion {
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

export interface QuickProductRegistrationInput {
  organizationId: string;
  masterProductId: string | null;
  name: string;
  barcode: string;
  price: number;
  costPrice: number | null;
  stock: number;
  imageUrl: string | null;
}

