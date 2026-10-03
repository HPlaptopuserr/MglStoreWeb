import { Prisma } from "@mgl/database";
import type { VisualPublicProduct } from "../../services/visual-search/visual-search-products";
import type { VisualSearchOptions } from "../../services/visual-search/visual-search-options";

// This preview reads the unauthenticated storefront only. Never forward device credentials.
export const PUBLIC_CATALOG_ORIGIN = "https://mgl-api.onrender.com";
export type PreviewProduct = VisualPublicProduct & {
  discounts: { percent: number; validUntil: Date }[];
};

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid public catalog object");
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim())
    throw new Error("Invalid public catalog text");
  return value;
}
const optionalText = (value: unknown) =>
  typeof value === "string" ? value : null;
function number(value: unknown): number {
  if ((typeof value !== "number" && typeof value !== "string") || value === "")
    throw new Error("Invalid public catalog number");
  const result = Number(value);
  if (!Number.isFinite(result))
    throw new Error("Invalid public catalog number");
  return result;
}
function category(value: unknown) {
  if (value == null) return null;
  const item = object(value);
  return { id: text(item.id), name: text(item.name), slug: text(item.slug) };
}

/** Select known storefront fields; never retain cost/supplier fields from older servers. */
export function parsePublicProduct(value: unknown): PreviewProduct {
  const item = object(value);
  const org = object(item.organization);
  const group = category(item.businessCategory);
  if (!Array.isArray(item.images)) throw new Error("Invalid product images");
  const supplyType = item.supplyType;
  if (supplyType !== "IN_STOCK" && supplyType !== "CHINA_PREORDER")
    throw new Error("Invalid product supply type");
  return {
    id: text(item.id),
    name: text(item.name),
    description: optionalText(item.description),
    sku: optionalText(item.sku),
    barcode: optionalText(item.barcode),
    unit: optionalText(item.unit),
    price: new Prisma.Decimal(number(item.price)),
    stock: number(item.stock),
    supplyType,
    isRestaurantMenuItem: item.isRestaurantMenuItem === true,
    menuCategory: optionalText(item.menuCategory),
    images: item.images.map((value) => {
      const image = object(value);
      return { id: text(image.id), url: text(image.url) };
    }),
    organization: {
      id: text(org.id),
      name: text(org.name),
      logoUrl: optionalText(org.logoUrl),
    },
    businessCategory: group
      ? {
          ...group,
          parent: category(object(item.businessCategory).parent),
        }
      : null,
    discounts: (Array.isArray(item.discounts) ? item.discounts : [])
      .flatMap((value) => {
        const discount = object(value);
        const percent = number(discount.percent);
        const validUntil = new Date(text(discount.validUntil));
        return percent > 0 &&
          percent <= 100 &&
          validUntil.getTime() > Date.now()
          ? [{ percent, validUntil }]
          : [];
      })
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 1),
  };
}

export function matchesPreviewFilters(
  product: PreviewProduct,
  options: VisualSearchOptions,
) {
  const price = Number(product.price);
  return (
    (!options.inStock ||
      product.stock > 0 ||
      product.supplyType === "CHINA_PREORDER") &&
    (options.priceMin === undefined || price >= options.priceMin) &&
    (options.priceMax === undefined || price <= options.priceMax)
  );
}

export async function readPublicPage(parameters: Record<string, string>) {
  const url = new URL("/api/products", PUBLIC_CATALOG_ORIGIN);
  url.search = new URLSearchParams({
    ...parameters,
    meta: "1",
    _preview: String(Date.now()),
  }).toString();
  const response = await fetch(url, {
    headers: { Accept: "application/json", "Cache-Control": "no-cache" },
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok)
    throw new Error(`Public catalog returned ${response.status}`);
  const data = object(await response.json());
  if (!Array.isArray(data.products)) throw new Error("Missing public products");
  const total = number(data.total);
  if (!Number.isInteger(total) || total < 0 || total > 10_000)
    throw new Error("Unexpected preview catalog size");
  return {
    products: data.products.map(parsePublicProduct),
    total,
    hasMore: data.hasMore === true,
  };
}

export async function readPublicCatalog(): Promise<PreviewProduct[]> {
  const products = new Map<string, PreviewProduct>();
  for (let offset = 0; offset < 10_000; ) {
    const page = await readPublicPage({ limit: "100", offset: String(offset) });
    for (const product of page.products) products.set(product.id, product);
    offset += page.products.length;
    if (!page.hasMore) return [...products.values()];
    if (!page.products.length)
      throw new Error("Public catalog pagination stalled");
  }
  throw new Error("Public catalog exceeds preview limit");
}

export async function loadPreviewProducts(
  ids: string[],
  options: VisualSearchOptions,
) {
  const products = new Map<string, PreviewProduct>();
  for (let start = 0; start < ids.length; start += 40) {
    const batch = ids.slice(start, start + 40);
    const page = await readPublicPage({ ids: batch.join(","), limit: "100" });
    for (const product of page.products) {
      if (batch.includes(product.id) && matchesPreviewFilters(product, options))
        products.set(product.id, product);
    }
  }
  return ids.flatMap((id) => {
    const product = products.get(id);
    return product ? [product] : [];
  });
}
