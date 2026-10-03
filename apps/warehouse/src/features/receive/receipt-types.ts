export type ReceiveItem = {
  productId: string;
  name: string;
  sku: string | null;
  quantity: number;
  unit?: string;
  barcode?: string | null;
  barcodeAliases?: string[];
  cost: number;
  batchNumber: string;
  expiryDate: string;
  location: string;
  isNew?: boolean;
  draftProduct?: {
    barcode: string;
    price: string;
    masterProductId?: string;
    description?: string | null;
    businessCategoryId?: string | null;
    imageUrl?: string | null;
  };
};
