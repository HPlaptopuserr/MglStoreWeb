export interface BestSellingProduct {
  rank: number;
  productId: string;
  name: string;
  sku: string | null;
  unit: string;
  quantitySold: number;
  revenue: number;
  salesCount: number;
}

export interface BestSellingProductsResponse {
  from: string;
  to: string;
  products: BestSellingProduct[];
}
