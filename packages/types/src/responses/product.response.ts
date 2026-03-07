import type { ID } from "../primitives";
import type { Product, ProductImage, Discount } from "../domain/product";
import type { Category } from "../domain/company";
import type { Organization } from "../domain/company";

export interface ProductResponse extends Product {
  organization?: Pick<Organization, "id" | "name" | "slug" | "logoUrl">;
  category?: Pick<Category, "id" | "name" | "slug" | "parentId"> | null;

  images?: ProductImage[];
  discounts?: Discount[];
}
