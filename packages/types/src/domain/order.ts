import type { BaseEntity, SoftDelete } from "../common";
import type { DecimalString, ID, ISODateString } from "../primitives";
import type {
  DeliveryStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ReturnStatus,
} from "../enums";
import type { JsonValue } from "../primitives";

export interface Order extends BaseEntity, SoftDelete {
  id: ID;

  organizationId: ID;
  customerId: ID;

  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod | null;

  shippingAddress: string;
  phone: string;
  note?: string | null;

  shippingAddressId?: ID | null;

  subtotal: DecimalString;
  discountAmount: DecimalString;
  deliveryFee: DecimalString;
  total: DecimalString;
}

export interface OrderItem {
  id: ID;
  orderId: ID;
  productId: ID;
  quantity: number;
  price: DecimalString;
  subtotal: DecimalString;
}

export interface OrderHistory {
  id: ID;
  orderId: ID;
  status: OrderStatus;
  timestamp: ISODateString;
  changedById?: ID | null;
  note?: string | null;
}

export interface PaymentAttempt {
  id: ID;
  orderId: ID;

  method: PaymentMethod;
  status: PaymentStatus;

  amount: DecimalString;

  providerRef?: string | null;
  rawPayload?: JsonValue | null;

  failureReason?: string | null;
  paidAt?: ISODateString | null;
  refundedAt?: ISODateString | null;
  cancelledAt?: ISODateString | null;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Delivery {
  id: ID;
  orderId: ID;

  courierId?: ID | null;

  status: DeliveryStatus;
  trackingCode?: string | null;

  pickupTime?: ISODateString | null;
  deliveredAt?: ISODateString | null;
  proofImage?: string | null;

  updatedAt: ISODateString;
  cancelledAt?: ISODateString | null;
}

export interface CourierLocationHistory {
  id: ID;
  userId: ID;
  lat: number;
  lng: number;
  createdAt: ISODateString;
}

export interface ReturnRequest {
  id: ID;
  orderId: ID;
  reason: string;
  status: ReturnStatus;
  resolvedAt?: ISODateString | null;
  resolvedById?: ID | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
