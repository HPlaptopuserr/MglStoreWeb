import { mkdir, open, rm } from "node:fs/promises";
import path from "node:path";
import {
  cacheDirectory,
  contentDigest,
  EMBEDDING_VERSION,
  MODEL_ID,
  MODEL_REVISION,
  type VisualEntry,
  type VisualIndex,
} from "./visual-search-index";

export async function withVisualIndexLock<T>(
  operation: () => Promise<T>,
): Promise<T> {
  await mkdir(cacheDirectory(), { recursive: true });
  const lockPath = path.join(cacheDirectory(), "build.lock");
  const lock = await open(lockPath, "wx", 0o600).catch(() => {
    throw new Error(
      "Visual index build locked. Check the existing builder before removing build.lock.",
    );
  });
  try {
    await lock.writeFile(
      JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }),
    );
    return await operation();
  } finally {
    await lock.close();
    await rm(lockPath, { force: true });
  }
}

export async function buildVisualEntry(
  input: {
    productId: string;
    imageId: string;
    sourceHash: string;
    bytes: Buffer;
    previous?: VisualEntry;
    force?: boolean;
  },
  encode: (bytes: Buffer) => Promise<number[]>,
): Promise<VisualEntry> {
  const contentHash = contentDigest(input.bytes);
  const vector =
    !input.force && input.previous?.contentHash === contentHash
      ? input.previous.vector
      : await encode(input.bytes);
  return {
    productId: input.productId,
    imageId: input.imageId,
    sourceHash: input.sourceHash,
    contentHash,
    vector,
  };
}

export function buildVisualSnapshot(
  entries: VisualEntry[],
  eligibleProducts: number,
  failedImages: number,
): VisualIndex {
  const covered = new Set(entries.map((entry) => entry.productId)).size;
  // An empty real catalog is valid. Failed fetches must not replace a usable catalog.
  if (eligibleProducts > 0 && covered / eligibleProducts < 0.95) {
    throw new Error(
      `Only ${covered}/${eligibleProducts} products indexed; previous snapshot retained`,
    );
  }
  return {
    version: 2,
    embeddingVersion: EMBEDDING_VERSION,
    model: MODEL_ID,
    revision: MODEL_REVISION,
    updatedAt: new Date().toISOString(),
    eligibleProducts,
    failedImages,
    entries,
  };
}
