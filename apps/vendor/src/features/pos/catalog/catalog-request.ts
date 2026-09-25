import { authFetch } from "@/lib/api";
import { PosApiError } from "../api/_pos-client";
import { posErrorMessage } from "../api/pos-error-message";
import { isRecord } from "./catalog-model";

export async function requestCatalog(
  url: string,
  signal?: AbortSignal,
  etag?: string | null,
) {
  const response = await authFetch(url, {
    signal,
    cache: "no-store",
    headers: etag ? { "If-None-Match": etag } : undefined,
  });
  const nextEtag = response.headers.get("ETag") || etag || null;
  if (response.status === 304)
    return { unchanged: true as const, etag: nextEtag };
  if (!response.ok)
    throw new PosApiError(
      posErrorMessage(await response.text(), response.status),
      response.status,
    );
  const body: unknown = await response.json();
  const rows: unknown = Array.isArray(body)
    ? body
    : isRecord(body)
      ? body.products
      : null;
  const countHeader = response.headers.get("X-MGL-Catalog-Count");
  if (
    !Array.isArray(rows) ||
    (isRecord(body) &&
      !Array.isArray(body) &&
      (body.hasMore === true ||
        (typeof body.total === "number" && body.total !== rows.length))) ||
    (countHeader !== null && Number(countHeader) !== rows.length)
  ) {
    throw new Error(
      "Барааны жагсаалт бүрэн ирсэнгүй. Сүүлийн бүрэн жагсаалтыг ашиглаж байна.",
    );
  }
  return {
    unchanged: false as const,
    etag: response.headers.get("ETag"),
    rows: rows as unknown[],
  };
}
