import type { BaseEntity, SoftDelete } from "../common";
import type {
  ID,
  DecimalString,
  ISODateString,
  URLString,
} from "../primitives";
import type {
  InventoryReason,
  ProductApprovalStatus,
  ProductRequestType,
} from "../enums";

export interface Product extends BaseEntity, SoftDelete {
  id: ID;
  organizationId: ID;

  name: string;
  description?: string | null;
  sku?: string | null;

  price: DecimalString;
  wholesalePrice?: DecimalString | null;
  orderPrice?: DecimalString | null;
  costPrice?: DecimalString | null;

  stock: number;
  isActive: boolean;

  categoryId?: ID | null;
}

export interface ProductImage {
  id: ID;
  productId: ID;
  url: URLString;
}

export interface Discount {
  id: ID;
  productId: ID;
  percent: number;
  validUntil: ISODateString;
}

export interface InventoryLedger {
  id: ID;
  productId: ID;
  change: number;
  reason: InventoryReason;
  note?: string | null;
  createdAt: ISODateString;
}

export interface ProductRequest {
  id: ID;
  type: ProductRequestType;

  organizationId: ID;
  submittedById: ID;
  reviewedById?: ID | null;
  productId?: ID | null;

  status: ProductApprovalStatus;

  name: string;
  description?: string | null;
  sku?: string | null;

  price: DecimalString;
  costPrice?: DecimalString | null;
  stock: number;

  categoryId?: ID | null;

  rejectReason?: string | null;
  reviewNote?: string | null;

  submittedAt: ISODateString;
  reviewedAt?: ISODateString | null;
  approvedAt?: ISODateString | null;
  rejectedAt?: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface ProductRequestImage {
  id: ID;
  productRequestId: ID;
  url: URLString;
}
