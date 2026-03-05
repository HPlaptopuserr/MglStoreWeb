// packages/types/src/domain/order.ts
import type { DecimalString, ID, ISODateString, SoftDeletable, Timestamps } from "../primitives";
import type { OrderStatus } from "../enums/orderStatus";
import type { DeliveryStatus } from "../enums/deliveryStatus";

export enum PaymentStatus {
    PENDING = "PENDING",
    PAID = "PAID",
    FAILED = "FAILED",
    REFUNDED = "REFUNDED",
    CANCELLED = "CANCELLED",
}

export enum PaymentMethod {
    CASH = "CASH",
    CARD = "CARD",
    QPAY = "QPAY",
    BANK_TRANSFER = "BANK_TRANSFER",
}

export enum ReturnStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
}

export interface Order extends Timestamps, SoftDeletable {
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

export interface PaymentAttempt extends Timestamps {
    id: ID;
    orderId: ID;

    method: PaymentMethod;
    status: PaymentStatus;

    amount: DecimalString;

    providerRef?: string | null;
    rawPayload?: unknown; // Prisma Json

    failureReason?: string | null;
    paidAt?: ISODateString | null;
    refundedAt?: ISODateString | null;
    cancelledAt?: ISODateString | null;
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

export interface ReturnRequest extends Timestamps {
    id: ID;
    orderId: ID;

    reason: string;
    status: ReturnStatus;

    resolvedAt?: ISODateString | null;
    resolvedById?: ID | null;
}