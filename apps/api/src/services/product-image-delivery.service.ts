import {
  decodeInlineProductImage,
  resolveProductImageRemoteUrl,
  type InlineProductImage,
} from "../lib/product-image-delivery";
import {
  ProductImageDeliveryError,
  productImageNetworkError,
  productImageUpstreamError,
} from "../lib/product-image-errors";

const PRODUCT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

export async function loadProductImage(
  storedValue: string | null | undefined,
  configuredSupabaseUrl: string | undefined,
  fetchImage: typeof fetch = fetch,
): Promise<InlineProductImage> {
  if (!storedValue) throw new ProductImageDeliveryError("IMAGE_NOT_FOUND");

  const inline = decodeInlineProductImage(storedValue);
  if (inline) {
    if (inline.body.length > PRODUCT_IMAGE_MAX_BYTES) {
      throw new ProductImageDeliveryError("IMAGE_TOO_LARGE");
    }
    return inline;
  }
  if (storedValue.startsWith("data:")) {
    throw new ProductImageDeliveryError("IMAGE_SOURCE_INVALID");
  }
  if (!configuredSupabaseUrl) {
    throw new ProductImageDeliveryError("IMAGE_STORAGE_NOT_CONFIGURED");
  }
  const remoteUrl = resolveProductImageRemoteUrl(
    storedValue,
    configuredSupabaseUrl,
  );
  if (!remoteUrl) throw new ProductImageDeliveryError("IMAGE_SOURCE_INVALID");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const upstream = await fetchImage(remoteUrl, {
      signal: controller.signal,
      headers: { Accept: "image/*" },
      redirect: "error",
    });
    if (!upstream.ok) {
      await upstream.body?.cancel();
      throw productImageUpstreamError(upstream.status);
    }

    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      await upstream.body?.cancel();
      throw new ProductImageDeliveryError("IMAGE_RESPONSE_INVALID");
    }
    if (
      Number(upstream.headers.get("content-length") || 0) >
      PRODUCT_IMAGE_MAX_BYTES
    ) {
      await upstream.body?.cancel();
      throw new ProductImageDeliveryError("IMAGE_TOO_LARGE");
    }

    // Enforce the size limit while reading, even without Content-Length.
    const reader = upstream.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > PRODUCT_IMAGE_MAX_BYTES) {
            await reader.cancel();
            throw new ProductImageDeliveryError("IMAGE_TOO_LARGE");
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
    }
    if (!size) throw new ProductImageDeliveryError("IMAGE_NOT_FOUND");
    return { contentType, body: Buffer.concat(chunks, size) };
  } catch (error) {
    if (error instanceof ProductImageDeliveryError) throw error;
    throw productImageNetworkError(error);
  } finally {
    clearTimeout(timeout);
  }
}
