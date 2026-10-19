import type { ManagedProduct } from "./managed-product.types";

export function productCurrency(product: ManagedProduct) {
  return product.supplyType === "CHINA_PREORDER"
    ? product.preorderPriceCurrency || "MNT"
    : "MNT";
}
export function productPrice(product: ManagedProduct) {
  return product.supplyType === "CHINA_PREORDER"
    ? (product.preorderPriceAmount ?? product.price)
    : product.price;
}
export function formatManagedPrice(product: ManagedProduct) {
  const price = productPrice(product);
  if (price == null || !Number.isFinite(Number(price))) return "Үнэ тохироогүй";
  return new Intl.NumberFormat("mn-MN", {
    style: "currency",
    currency: productCurrency(product),
    maximumFractionDigits: 2,
  }).format(Number(price));
}
export function formatManagedStock(product: ManagedProduct) {
  return product.supplyType === "CHINA_PREORDER"
    ? "Захиалгаар"
    : `${product.stock ?? 0} ${product.unit === "kg" ? "кг" : "ширхэг"}`;
}

// Send only changed fields, so a price correction cannot overwrite inventory.
export function buildQuickProductPatch(
  product: ManagedProduct,
  priceInput: string,
  stockInput: string,
): Record<string, number> {
  const patch: Record<string, number> = {};
  const price = Number(priceInput);
  if (!priceInput.trim() || !Number.isFinite(price) || price < 0)
    throw new Error("Үнэ 0 эсвэл түүнээс их тоо байх ёстой.");
  if (productPrice(product) == null || price !== Number(productPrice(product)))
    patch[
      product.supplyType === "CHINA_PREORDER" ? "preorderPriceAmount" : "price"
    ] = price;
  if (product.supplyType !== "CHINA_PREORDER") {
    const stock = Number(stockInput);
    const multiplier = product.unit === "kg" ? 1000 : 1;
    if (
      !stockInput.trim() ||
      !Number.isFinite(stock) ||
      stock < 0 ||
      Math.abs(stock * multiplier - Math.round(stock * multiplier)) >
        0.000001 ||
      stock * multiplier > 2147483647
    )
      throw new Error(
        product.unit === "kg"
          ? "Нөөцийг 0-ээс их буюу тэнцүү, 3 хүртэл орны нарийвчлалтай оруулна уу."
          : "Нөөцийг 0-ээс их буюу тэнцүү бүхэл тоогоор оруулна уу.",
      );
    if (stock !== Number(product.stock ?? 0)) patch.stock = stock;
  }
  return patch;
}
