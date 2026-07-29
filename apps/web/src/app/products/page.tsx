import { API } from "@/lib/api";
import ProductsPageClient, {
  type ApiCategory,
  type ApiProduct,
  type ProductsPageInitialData,
} from "./ProductsPageClient";
import {
  LOCAL_MOCK_CATALOG_ENABLED,
  localCatalogCategories,
  queryLocalCatalog,
} from "@/lib/local-product-catalog";

const PRODUCTS_PER_PAGE = 30;
const WEB_PRODUCTS_SETTING_KEY = "web-products-enabled";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function isEnabled(value: string | undefined): boolean {
  return (
    value === undefined ||
    value === "" ||
    value === "1" ||
    value === "true" ||
    value === "on"
  );
}

async function getInitialData(
  searchParams: SearchParams,
): Promise<ProductsPageInitialData | undefined> {
  const recommendationSeed = new Date().toISOString().slice(0, 10);
  if (LOCAL_MOCK_CATALOG_ENABLED) {
    const result = queryLocalCatalog({
      businessCategoryId: firstValue(searchParams.category),
      search: firstValue(searchParams.search) || firstValue(searchParams.q),
      type: firstValue(searchParams.type),
      sort: firstValue(searchParams.sort) || "recommended",
      discountOnly: ["1", "true"].includes(firstValue(searchParams.discount)),
      limit: PRODUCTS_PER_PAGE,
      offset: 0,
    });

    return {
      categories: localCatalogCategories,
      products: result.products,
      total: result.total,
      webProductsEnabled: true,
      recommendationSeed,
    };
  }

  const query = new URLSearchParams({
    sort: firstValue(searchParams.sort) || "recommended",
    limit: String(PRODUCTS_PER_PAGE),
    offset: "0",
    meta: "1",
    recommendationSeed,
  });

  const category = firstValue(searchParams.category);
  const search = firstValue(searchParams.search) || firstValue(searchParams.q);
  const type = firstValue(searchParams.type);
  const discount = firstValue(searchParams.discount);
  if (category) query.set("businessCategoryId", category);
  if (search) query.set("search", search);
  if (type) query.set("type", type);
  if (discount) query.set("discount", discount);

  try {
    const [categoriesResponse, settingsResponse, productsResponse] =
      await Promise.all([
        fetch(`${API}/business-categories?hasProducts=1`, {
          next: { revalidate: 300 },
        }),
        fetch(`${API}/site-settings`, { next: { revalidate: 60 } }),
        fetch(`${API}/products?${query.toString()}`, {
          next: { revalidate: 45 },
        }),
      ]);
    if (!productsResponse.ok) return undefined;

    const productsPayload = (await productsResponse.json()) as {
      products?: ApiProduct[];
      total?: number;
    };
    const categories = categoriesResponse.ok
      ? ((await categoriesResponse.json()) as ApiCategory[])
      : [];
    const settings = settingsResponse.ok
      ? ((await settingsResponse.json()) as Record<string, string>)
      : {};

    return {
      categories,
      products: productsPayload.products ?? [],
      total: productsPayload.total ?? 0,
      webProductsEnabled: isEnabled(settings[WEB_PRODUCTS_SETTING_KEY]),
      recommendationSeed,
    };
  } catch {
    return undefined;
  }
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const initialData = await getInitialData(resolvedSearchParams);
  return <ProductsPageClient initialData={initialData} />;
}
