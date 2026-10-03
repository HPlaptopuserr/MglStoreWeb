import type { Product } from "@/features/products";
import { salesDay } from "../pos/utils/sales-history-filters";

export interface ProductReportFilters {
  search: string;
  status: "all" | "active" | "inactive";
  category: string;
  from: string;
  to: string;
}
export const emptyProductReportFilters: ProductReportFilters = {
  search: "",
  status: "all",
  category: "all",
  from: "",
  to: "",
};
export function isValidReportRange(from: string, to: string) {
  return !from || !to || from <= to;
}
export function filterReportProducts(
  products: readonly Product[],
  filters: ProductReportFilters,
) {
  if (!isValidReportRange(filters.from, filters.to)) return [];
  const query = filters.search.trim().toLocaleLowerCase("mn");
  return products.filter((product) => {
    if (
      query &&
      ![product.name, product.sku, product.barcode].some((value) =>
        value?.toLocaleLowerCase("mn").includes(query),
      )
    )
      return false;
    if (
      filters.status !== "all" &&
      product.isActive !== (filters.status === "active")
    )
      return false;
    if (
      filters.category !== "all" &&
      product.businessCategory?.name !== filters.category
    )
      return false;
    if (!filters.from && !filters.to) return true;
    return [
      product.createdAt,
      ...(product.receiptLots || []).map((lot) => lot.receivedAt),
    ].some((value) => {
      if (!value || !Number.isFinite(Date.parse(value))) return false;
      const day = salesDay(value);
      return (
        (!filters.from || day >= filters.from) &&
        (!filters.to || day <= filters.to)
      );
    });
  });
}
export function describeProductReportFilters(filters: ProductReportFilters) {
  return [
    filters.status === "active"
      ? "Идэвхтэй"
      : filters.status === "inactive"
        ? "Идэвхгүй"
        : "Бүх төлөв",
    filters.category === "all" ? "Бүх ангилал" : filters.category,
    filters.search.trim() ? `Хайлт: ${filters.search.trim()}` : null,
    filters.from || filters.to
      ? `Бүртгэсэн / хүлээн авсан: ${filters.from || "Эхнээс"} – ${filters.to || "Өнөөдрийг хүртэл"}`
      : "Бүртгэсэн / хүлээн авсан: бүх хугацаа",
    "Үлдэгдэл болон үнэ нь одоогийн бүртгэлээр",
  ]
    .filter(Boolean)
    .join(" · ");
}
