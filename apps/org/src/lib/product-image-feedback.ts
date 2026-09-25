import type { ProductImageErrorResponse } from "@mgl/types";
import { API } from "./api";

export type ProductImageFailure = Pick<ProductImageErrorResponse, "message"> &
  Partial<Pick<ProductImageErrorResponse, "code" | "action" | "requestId">>;

export const DEFAULT_IMAGE_FAILURE: ProductImageFailure = {
  message: "Бүтээгдэхүүний зураг ачаалсангүй.",
  action:
    "Интернэт холболтоо шалгаад дахин оролдоно уу. Давтагдвал ажилтанд мэдэгдэнэ үү.",
};

export function isProductImageApiUrl(src: string) {
  try {
    const url = new URL(src, window.location.href);
    const api = new URL(API, window.location.href);
    return (
      url.origin === api.origin &&
      url.pathname.startsWith(`${api.pathname}/products/`) &&
      url.pathname.endsWith("/primary-image")
    );
  } catch {
    return false;
  }
}

export function retryProductImageUrl(src: string, attempt: number) {
  if (!attempt || !isProductImageApiUrl(src)) return src;
  const url = new URL(src, window.location.href);
  url.searchParams.set("imageRetry", String(attempt));
  return url.toString();
}

function isImageErrorResponse(
  value: unknown,
): value is ProductImageErrorResponse {
  if (typeof value !== "object" || value === null) return false;
  return (
    "code" in value &&
    typeof value.code === "string" &&
    value.code.startsWith("IMAGE_") &&
    value.code.length <= 64 &&
    "message" in value &&
    typeof value.message === "string" &&
    value.message.length <= 300 &&
    "action" in value &&
    typeof value.action === "string" &&
    value.action.length <= 500 &&
    "retryable" in value &&
    typeof value.retryable === "boolean" &&
    "requestId" in value &&
    typeof value.requestId === "string" &&
    value.requestId.length <= 64
  );
}

export async function diagnoseProductImageFailure(
  src: string,
  signal: AbortSignal,
): Promise<ProductImageFailure> {
  // Successful images keep the browser's native loading/cache path. Only a
  // failed first-party image gets a diagnostic request; never probe external URLs.
  if (!isProductImageApiUrl(src)) return DEFAULT_IMAGE_FAILURE;
  try {
    const response = await fetch(src, { signal, cache: "no-store" });
    if (
      !response.ok &&
      response.headers.get("content-type")?.includes("application/json")
    ) {
      const payload: unknown = await response.json();
      if (isImageErrorResponse(payload)) return payload;
    } else {
      await response.body?.cancel();
    }
  } catch {
    // Offline clients, CORS failures and older API versions still get a useful
    // fallback. The provider discards aborted/stale diagnostics.
  }
  return DEFAULT_IMAGE_FAILURE;
}
