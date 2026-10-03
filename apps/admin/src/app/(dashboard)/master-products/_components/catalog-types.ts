export type MasterProductRow = {
  id: string;
  canonicalName: string;
  barcode: string | null;
  brand: string | null;
  unit: string | null;
  categoryName: string | null;
  linkedProductCount: number;
  organizationCount: number;
  systemStock: number;
  systemSoldQuantity90d: number;
  systemRequestedQuantity90d: number;
  updatedAt: string;
};

export type MasterCatalogResponse = {
  items: MasterProductRow[];
  total: number;
  unlinkedProductCount: number;
  page: number;
  hasMore: boolean;
};
