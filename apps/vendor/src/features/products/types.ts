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

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  price: number;
  costPrice: number | null;
  stock: number;
  supplyType: "IN_STOCK" | "CHINA_PREORDER";
  preorderLeadTimeDays: number | null;
  preorderNote: string | null;
  isActive: boolean;
  images: ProductImage[];
  businessCategoryId: string | null;
  businessCategory: { id: string; name: string } | null;
  createdAt: string;
}

export interface FormState {
  name: string;
  sku: string;
  barcode: string;
  description: string;
  price: string;
  costPrice: string;
  stock: string;
  supplyType: "IN_STOCK" | "CHINA_PREORDER";
  preorderLeadTimeDays: string;
  preorderNote: string;
  businessCategoryId: string;
  images: string[];
}

export interface PlanStatus {
  isActive: boolean;
  planType: string | null;
  planExpiresAt: string | null;
  trialUsed: boolean;
  currentPlan: { maxProducts: number; name: string; isTrial: boolean } | null;
}
