import { setTimeout as delay } from "node:timers/promises";
import { ProductImageDeliveryError } from "../../lib/product-image-errors";
import { loadProductImage } from "../product-image-delivery.service";

/** Known storefront assets and configured storage only. Never fetch arbitrary catalog URLs. */
export function visualImageStorageOrigin(source: string): string | undefined {
  try {
    const url = new URL(source);
    if (
      url.origin === "https://mglstore.mn" &&
      url.pathname.startsWith("/mgl-water/")
    )
      return url.origin;
  } catch {
    /* Inline images are decoded by the shared loader. */
  }
  return process.env.SUPABASE_URL;
}
export async function loadVisualCatalogImage(
  source: string,
  load = loadProductImage,
  pause: (milliseconds: number) => Promise<unknown> = delay,
) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await load(source, visualImageStorageOrigin(source));
    } catch (error: unknown) {
      if (
        attempt >= 2 ||
        !(error instanceof ProductImageDeliveryError) ||
        !error.toResponse("").retryable
      )
        throw error;
      await pause(250 * 2 ** attempt);
    }
  }
}
