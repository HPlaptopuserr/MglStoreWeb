export type RecommendationReason =
  | "STOCK_REPLENISHMENT"
  | "REPEAT_PURCHASE"
  | "NETWORK_TRENDING";

export interface RecommendationFeatures {
  availableStock: number;
  organizationStock: number;
  personalRequestedQuantity90d: number;
  personalRequestCount90d: number;
  networkRequestedQuantity90d: number;
  networkRequestCount90d: number;
  networkOrganizationCount90d: number;
}

export interface RecommendationCandidate {
  inventoryId: string;
  productId: string;
  product: {
    id: string;
    name: string;
    sku: string | null;
    price: string;
    images: { url: string }[];
    category: { id: string; name: string } | null;
    businessCategory: { id: string; name: string } | null;
  };
  features: RecommendationFeatures;
}

export interface ScoredRecommendation {
  candidate: RecommendationCandidate;
  score: number;
  confidence: number;
  suggestedQuantity: number;
  reason: RecommendationReason;
  explanation: string;
}

export interface RecommendationContext {
  organizationId: string;
  warehouseId: string;
  limit: number;
}

export interface RecommendationResult {
  engine: {
    strategy: string;
    version: string;
  };
  generatedAt: string;
  items: ScoredRecommendation[];
}
