import type { DecimalString, ID } from "../primitives";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "../enums";

export interface CreateOrderItemDto {
  productId: ID;
  quantity: number;
}

export interface CreateOrderDto {
  organizationId: ID;
  customerId: ID;
  shippingAddress: string;
  phone: string;
  note?: string;
  shippingAddressId?: ID;
  paymentMethod?: PaymentMethod;
  items: CreateOrderItemDto[];
}

export interface UpdateOrderStatusDto {
  status: OrderStatus;
  changedById?: ID;
  note?: string;
}

export interface UpdatePaymentStatusDto {
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
}

export interface OrderSummaryDto {
  subtotal: DecimalString;
  discountAmount: DecimalString;
  deliveryFee: DecimalString;
  total: DecimalString;
}
