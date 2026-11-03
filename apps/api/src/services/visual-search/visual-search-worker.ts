import { persistentVisualSearchEnabled } from "./visual-search-config";
import { visualSearchEnabled } from "./visual-search-errors";
import { reconcileVisualImages } from "./visual-search-incremental";
import { encodeSearchImage } from "./visual-search-encoder";
import { loadVisualCatalogImage } from "./visual-search-image-source";
import {
  visualCatalogImages,
  pendingVisualImages,
  claimVisualImage,
  completeVisualImage,
  failVisualImage,
  visualImageToken,
} from "./visual-search-store";

/** Recovers missing work from catalog metadata, including imports and every upload route. */
export function startVisualSearchWorker() {
  if (!visualSearchEnabled() || !persistentVisualSearchEnabled()) return;
  let running = false;
  let stopped = false;
  let reported = false;
  const tick = async () => {
    if (running || stopped) return;
    running = true;
    try {
      const result = await reconcileVisualImages({
        images: async () => (await visualCatalogImages()).images,
        pending: pendingVisualImages,
        claim: claimVisualImage,
        load: async (url) => (await loadVisualCatalogImage(url)).body,
        encode: (bytes) => encodeSearchImage(bytes, true),
        complete: completeVisualImage,
        fail: failVisualImage,
        token: visualImageToken,
        now: Date.now,
      });
      if (!reported || result.processed || result.failed)
        console.info("[visual-search] Incremental update", result);
      reported = true;
    } catch (error: unknown) {
      console.error("[visual-search] Update deferred", {
        reason: error instanceof Error ? error.name : "UnknownError",
      });
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => {
    void tick();
  }, 30_000);
  timer.unref();
  const stop = () => {
    stopped = true;
    clearInterval(timer);
  };
  void tick();
  return stop;
}
