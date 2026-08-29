import { API, getApiErrorMessage } from "@/lib/api";

import type { Product } from "./product-development.model";

const PRODUCT_PAGE_SIZE = 100;
const PRODUCT_REQUEST_CONCURRENCY = 3;

type ProductPageResponse = {
  products: Product[];
  total: number;
  hasMore: boolean;
};

type ProductPagePayload = Partial<ProductPageResponse> & {
  products?: unknown;
};

function normalizeProduct(value: unknown): Product | null {
  if (!value || typeof value !== "object") return null;

  const product = value as Record<string, unknown>;
  if (typeof product.id !== "string" || typeof product.name !== "string") {
    return null;
  }

  const numericPrice = Number(product.price);
  return {
    ...(product as unknown as Product),
    price: Number.isFinite(numericPrice) ? numericPrice : 0,
  };
}

async function fetchProductPage(
  offset: number,
  signal?: AbortSignal,
): Promise<ProductPageResponse> {
  const response = await fetch(
    `${API}/products?limit=${PRODUCT_PAGE_SIZE}&offset=${offset}&meta=1&compact=1&webEligibleOnly=1`,
    { cache: "no-store", signal },
  );
  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        "Барааны жагсаалт авахад алдаа гарлаа",
      ),
    );
  }

  const payload: unknown = await response.json();
  if (Array.isArray(payload)) {
    const products = payload
      .map(normalizeProduct)
      .filter((product): product is Product => product !== null);
    return { products, total: products.length, hasMore: false };
  }

  if (!payload || typeof payload !== "object") {
    return { products: [], total: 0, hasMore: false };
  }

  const page = payload as ProductPagePayload;
  const products = Array.isArray(page.products)
    ? page.products
        .map(normalizeProduct)
        .filter((product): product is Product => product !== null)
    : [];
  return {
    products,
    total: Number.isFinite(page.total) ? Number(page.total) : products.length,
    hasMore: page.hasMore === true,
  };
}

/**
 * Loads the public catalog without flooding the API/database. The catalog can
 * contain thousands of products, so pages are deliberately fetched by a small
 * worker pool instead of one unbounded Promise.all.
 */
export async function fetchAllProducts(
  signal?: AbortSignal,
): Promise<Product[]> {
  const firstPage = await fetchProductPage(0, signal);
  const pageCount = Math.ceil(firstPage.total / PRODUCT_PAGE_SIZE);
  const offsets = Array.from(
    { length: Math.max(0, pageCount - 1) },
    (_, index) => (index + 1) * PRODUCT_PAGE_SIZE,
  );
  const pages: ProductPageResponse[] = new Array(offsets.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < offsets.length) {
      const index = nextIndex++;
      pages[index] = await fetchProductPage(offsets[index], signal);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(PRODUCT_REQUEST_CONCURRENCY, offsets.length) },
      () => worker(),
    ),
  );

  const productById = new Map<string, Product>();
  for (const product of [
    ...firstPage.products,
    ...pages.flatMap((page) => page.products),
  ]) {
    productById.set(product.id, product);
  }

  return [...productById.values()];
}
