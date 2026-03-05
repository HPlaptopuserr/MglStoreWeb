import type { ID } from "../primitives";
import type { Product, ProductImage, Discount, Category } from "../domain/product";
import type { Organization } from "../domain/company";

export interface ProductResponse extends Product {
    organization?: Pick<Organization, "id" | "name" | "slug" | "logoUrl">;
    category?: Pick<Category, "id" | "name" | "slug" | "parentId"> | null;

    images?: ProductImage[];
    discounts?: Discount[];
}