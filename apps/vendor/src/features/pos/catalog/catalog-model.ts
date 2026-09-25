import type { PosProduct } from "../types/pos.types";

export const CATALOG_FRESH_MS = 60_000;
export const CATALOG_MAX_AGE_MS = 24 * 60 * 60_000;

export interface CatalogSnapshot {
  version: 1;
  products: PosProduct[];
  count: number;
  updatedAt: number;
  etag: string | null;
}

export type CatalogResponse =
  | { unchanged: true; etag: string | null }
  | { unchanged: false; etag: string | null; products: PosProduct[] };

export type CatalogFetcher = (
  signal: AbortSignal,
  etag: string | null,
) => Promise<CatalogResponse>;

export interface CatalogPersistence {
  read(key: string): Promise<unknown>;
  write(key: string, snapshot: CatalogSnapshot): Promise<void>;
  remove(key: string): Promise<void>;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isCompleteProductList(value: unknown): value is PosProduct[] {
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();
  return value.every((item: unknown) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      !item.id ||
      ids.has(item.id) ||
      typeof item.name !== "string" ||
      typeof item.sku !== "string" ||
      typeof item.isActive !== "boolean" ||
      typeof item.price !== "number" ||
      !Number.isFinite(item.price) ||
      typeof item.stockQty !== "number" ||
      !Number.isFinite(item.stockQty)
    )
      return false;
    ids.add(item.id);
    return true;
  });
}

export function readSnapshot(
  value: unknown,
  now: number,
): CatalogSnapshot | null {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !isCompleteProductList(value.products) ||
    value.count !== value.products.length ||
    typeof value.updatedAt !== "number" ||
    !Number.isFinite(value.updatedAt) ||
    value.updatedAt > now ||
    now - value.updatedAt > CATALOG_MAX_AGE_MS ||
    !(value.etag === null || typeof value.etag === "string")
  )
    return null;
  return {
    version: 1,
    products: value.products,
    count: value.count as number,
    updatedAt: value.updatedAt,
    etag: value.etag,
  };
}

export function catalogKey(scope: {
  api: string;
  userId: string;
  organizationId: string;
  kind: "branch" | "organization";
  id: string;
}) {
  return JSON.stringify([
    1,
    scope.api,
    scope.userId,
    scope.organizationId,
    scope.kind,
    scope.id,
  ]);
}
