import type { DecimalString, ID, URLString } from "../primitives";
import type { ProductApprovalStatus, ProductRequestType } from "../enums";

export interface CreateProductDto {
  organizationId: ID;
  name: string;
  description?: string;
  sku?: string;
  price: DecimalString;
  costPrice?: DecimalString;
  stock?: number;
  categoryId?: ID;
  isActive?: boolean;
  imageUrls?: URLString[];
}

export interface UpdateProductDto {
  name?: string;
  description?: string | null;
  sku?: string | null;
  price?: DecimalString;
  costPrice?: DecimalString | null;
  stock?: number;
  categoryId?: ID | null;
  isActive?: boolean;
}

export interface CreateProductRequestDto {
  type?: ProductRequestType;
  organizationId: ID;
  submittedById: ID;
  productId?: ID;
  name: string;
  description?: string;
  sku?: string;
  price: DecimalString;
  costPrice?: DecimalString;
  stock?: number;
  categoryId?: ID;
  imageUrls?: URLString[];
}

export interface ReviewProductRequestDto {
  reviewedById: ID;
  status: ProductApprovalStatus;
  rejectReason?: string;
  reviewNote?: string;
}
