import type { DecimalString, ID } from "../primitives";

export interface CreateProductDto {
    organizationId: ID;

    name: string;
    description?: string;
    sku?: string;

    price: DecimalString;
    costPrice?: DecimalString;

    stock?: number;
    isActive?: boolean;

    categoryId?: ID | null;

    imageUrls?: string[];
}

export interface UpdateProductDto {
    name?: string;
    description?: string | null;
    sku?: string | null;

    price?: DecimalString;
    costPrice?: DecimalString | null;

    isActive?: boolean;

    categoryId?: ID | null;
}

export interface AdjustStockDto {
    productId: ID;
    change: number;
    reason: "ORDER" | "RETURN" | "RESTOCK" | "MANUAL_ADJUST";
    note?: string;
}