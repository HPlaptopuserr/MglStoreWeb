export interface RecommendedWarehouseItem {
  score: number;
  confidence: number;
  suggestedQuantity: number;
  reason: "STOCK_REPLENISHMENT" | "REPEAT_PURCHASE" | "NETWORK_TRENDING";
  explanation: string;
  candidate: {
    inventoryId: string;
    productId: string;
    features: {
      availableStock: number;
      organizationStock: number;
      personalRequestedQuantity90d: number;
      personalRequestCount90d: number;
      networkRequestedQuantity90d: number;
      networkRequestCount90d: number;
      networkOrganizationCount90d: number;
    };
    product: {
      id: string;
      name: string;
      sku: string | null;
      price: string;
      images: { url: string }[];
      category: { id: string; name: string } | null;
      businessCategory: { id: string; name: string } | null;
    };
  };
}
