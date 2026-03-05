import type { Order, OrderItem, OrderHistory, Delivery, PaymentAttempt, ReturnRequest } from "../domain/order";
import type { User, Address } from "../domain/user";
import type { Organization } from "../domain/company";
import type { Product } from "../domain/product";

export interface OrderItemResponse extends OrderItem {
    product?: Pick<Product, "id" | "name" | "sku" | "price">;
}

export interface OrderResponse extends Order {
    organization?: Pick<Organization, "id" | "name" | "slug">;
    customer?: Pick<User, "id" | "email" | "role">;

    shippingAddressRef?: Pick<Address, "id" | "label" | "fullAddress" | "city" | "district" | "khoroo"> | null;

    items?: OrderItemResponse[];
    history?: OrderHistory[];

    delivery?: Delivery | null;
    returnRequest?: ReturnRequest | null;

    payments?: PaymentAttempt[];
}