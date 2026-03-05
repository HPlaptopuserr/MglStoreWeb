// packages/types/src/dto/order.dto.ts
import type { DecimalString, ID } from "../primitives";
import type { PaymentMethod } from "../domain/order";
import type { OrderStatus } from "../enums/orderStatus";
import type { DeliveryStatus } from "../enums/deliveryStatus";
import type { ReturnStatus, PaymentStatus } from "../domain/order";

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

    shippingAddressId?: ID | null;

    paymentMethod?: PaymentMethod | null;

    items: CreateOrderItemDto[];
}

export interface ChangeOrderStatusDto {
    orderId: ID;
    status: OrderStatus;
    note?: string;
}

export interface ChangeDeliveryStatusDto {
    orderId: ID;
    status: DeliveryStatus;
    trackingCode?: string;
    proofImage?: string;
}

export interface CreatePaymentAttemptDto {
    orderId: ID;
    method: PaymentMethod;
    amount: DecimalString;
    providerRef?: string;
    rawPayload?: unknown;
}

export interface ChangePaymentStatusDto {
    paymentAttemptId: ID;
    status: PaymentStatus;
    failureReason?: string;
    rawPayload?: unknown;
}

export interface CreateReturnRequestDto {
    orderId: ID;
    reason: string;
}

export interface ResolveReturnRequestDto {
    orderId: ID;
    status: ReturnStatus;
    note?: string;
}