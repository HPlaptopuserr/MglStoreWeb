// packages/types/src/domain/product.ts
import type { DecimalString, ID, ISODateString, SoftDeletable, Timestamps } from "../primitives";

export interface Category extends Timestamps {
  id: ID;
  name: string;
  slug: string;

  parentId?: ID | null;
}

export interface Product extends Timestamps, SoftDeletable {
  id: ID;
  organizationId: ID;

  name: string;
  description?: string | null;
  sku?: string | null;

  price: DecimalString;
  costPrice?: DecimalString | null;

  stock: number; // cache field
  isActive: boolean;

  categoryId?: ID | null;
}

export interface ProductImage {
  id: ID;
  productId: ID;
  url: string;
}

export interface Discount {
  id: ID;
  productId: ID;

  percent: number;
  validUntil: ISODateString;
}

export enum InventoryReason {
  ORDER = "ORDER",
  RETURN = "RETURN",
  RESTOCK = "RESTOCK",
  MANUAL_ADJUST = "MANUAL_ADJUST",
}

export interface InventoryLedger {
  id: ID;
  productId: ID;

  change: number;
  reason: InventoryReason;
  note?: string | null;

  createdAt: ISODateString;
}