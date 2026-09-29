import { stat } from "node:fs/promises";
import { indexPath, readIndex, type VisualIndex } from "./visual-search-index";
import { warmVisualEncoder } from "./visual-search-encoder";
import { VisualSearchError } from "./visual-search-errors";

let cached: { signature: string; index: VisualIndex } | undefined;
export async function currentVisualIndex(): Promise<VisualIndex> {
  try {
    const file = await stat(indexPath());
    const signature = `${indexPath()}:${file.ino}:${file.mtimeMs}:${file.size}`;
    if (cached?.signature !== signature)
      cached = { signature, index: await readIndex() };
    return cached.index;
  } catch {
    throw new VisualSearchError(
      503,
      "VISUAL_SEARCH_NOT_READY",
      "Зургийн хайлт бэлтгэгдэж байна. Түр хугацаанд нэрээр нь хайна уу.",
    );
  }
}

export async function visualSearchReadiness() {
  try {
    const index = await currentVisualIndex();
    // Empty catalogs still produce a successful, meaningful empty result.
    if (index.entries.length) await warmVisualEncoder();
    return {
      ready: true,
      degraded:
        index.failedImages > 0 ||
        Date.now() - Date.parse(index.updatedAt) > 86_400_000,
    };
  } catch {
    return { ready: false, degraded: false };
  }
}
