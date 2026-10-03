import type { Prisma } from "@mgl/database";
import { VisualSearchError } from "./visual-search-errors";

export interface VisualSearchOptions {
  query: string;
  inStock: boolean;
  priceMin?: number;
  priceMax?: number;
  sort: "relevance" | "price_asc" | "price_desc";
  responseVersion: 1 | 2;
}
export const defaultVisualSearchOptions: VisualSearchOptions = {
  query: "",
  inStock: false,
  sort: "relevance",
  responseVersion: 1,
};

const invalid = () =>
  new VisualSearchError(
    400,
    "INVALID_SEARCH_OPTIONS",
    "Хайлтын нөхцөлөө шалгана уу.",
  );

/** Multipart is untrusted: reject duplicate, unknown and oversized fields. */
export function parseVisualSearchOptions(input: unknown): VisualSearchOptions {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw invalid();
  const data = input as Record<string, unknown>;
  const allowed = new Set([
    "query",
    "inStock",
    "priceMin",
    "priceMax",
    "sort",
    "responseVersion",
  ]);
  for (const [key, value] of Object.entries(data)) {
    if (!allowed.has(key) || typeof value !== "string") throw invalid();
  }
  const query = String(data.query ?? "").trim();
  if (query.length > 160 || /[\u0000-\u001f]/u.test(query)) throw invalid();
  const price = (key: string) => {
    if (data[key] === undefined) return undefined;
    const raw = String(data[key]);
    const value = Number(raw);
    if (
      !/^\d+(\.\d{1,2})?$/.test(raw) ||
      !Number.isFinite(value) ||
      value > 1e12
    )
      throw invalid();
    return value;
  };
  const priceMin = price("priceMin");
  const priceMax = price("priceMax");
  if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax)
    throw invalid();
  if (
    data.inStock !== undefined &&
    !["true", "false"].includes(String(data.inStock))
  )
    throw invalid();
  const sort = data.sort ?? "relevance";
  if (sort !== "relevance" && sort !== "price_asc" && sort !== "price_desc")
    throw invalid();
  if (
    data.responseVersion !== undefined &&
    !["1", "2"].includes(String(data.responseVersion))
  )
    throw invalid();
  return {
    query,
    priceMin,
    priceMax,
    sort,
    inStock: data.inStock === "true",
    responseVersion: data.responseVersion === "2" ? 2 : 1,
  };
}

export function visualSearchFilter(
  options: VisualSearchOptions,
): Prisma.ProductWhereInput {
  return {
    ...(options.inStock
      ? { OR: [{ stock: { gt: 0 } }, { supplyType: "CHINA_PREORDER" }] }
      : {}),
    ...(options.priceMin !== undefined || options.priceMax !== undefined
      ? {
          price: {
            ...(options.priceMin !== undefined
              ? { gte: options.priceMin }
              : {}),
            ...(options.priceMax !== undefined
              ? { lte: options.priceMax }
              : {}),
          },
        }
      : {}),
  };
}
