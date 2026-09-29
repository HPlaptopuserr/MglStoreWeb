import { createHash } from "node:crypto";
import {
  readFile,
  rename,
  mkdir,
  writeFile,
  copyFile,
  rm,
} from "node:fs/promises";
import path from "node:path";

export const MODEL_ID = "Xenova/clip-vit-base-patch32";
export const MODEL_REVISION = "d15189d7028b43f1d3e65039190477f6af591c2a";
export const EMBEDDING_SIZE = 512;
export const EMBEDDING_VERSION = `${MODEL_REVISION}:q8:contain-white-224:v1`;
export const contentDigest = (bytes: Buffer | string) =>
  createHash("sha256").update(bytes).digest("hex");
export const cacheDirectory = () =>
  path.resolve(process.env.VISUAL_SEARCH_CACHE_DIR || ".cache/visual-search");
export const indexPath = () => path.join(cacheDirectory(), "index.json");
export interface VisualEntry {
  productId: string;
  imageId: string;
  sourceHash: string;
  contentHash: string;
  vector: number[];
}
export interface VisualIndex {
  version: 2;
  embeddingVersion: string;
  model: string;
  revision: string;
  updatedAt: string;
  eligibleProducts: number;
  failedImages: number;
  entries: VisualEntry[];
}
export const imageSourceHash = (source: string) =>
  createHash("sha256").update(source).digest("hex");
export function normalizeVector(input: readonly number[]): number[] {
  if (
    input.length !== EMBEDDING_SIZE ||
    input.some((n) => !Number.isFinite(n))
  ) {
    throw new Error("Invalid visual embedding");
  }
  const norm = Math.hypot(...input);
  if (norm < 1e-9) throw new Error("Empty visual embedding");
  return input.map((n) => n / norm);
}
export function parseIndex(raw: string): VisualIndex {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object")
    throw new Error("Invalid visual index");
  const index = value as VisualIndex;
  if (
    index.version !== 2 ||
    index.embeddingVersion !== EMBEDDING_VERSION ||
    index.model !== MODEL_ID ||
    index.revision !== MODEL_REVISION ||
    !Number.isFinite(Date.parse(index.updatedAt)) ||
    !Number.isInteger(index.eligibleProducts) ||
    !Number.isInteger(index.failedImages) ||
    index.eligibleProducts < 0 ||
    index.failedImages < 0 ||
    !Array.isArray(index.entries)
  ) {
    throw new Error("Incompatible visual index; rebuild it");
  }
  for (const entry of index.entries) {
    if (
      !entry ||
      typeof entry.productId !== "string" ||
      typeof entry.imageId !== "string" ||
      typeof entry.sourceHash !== "string" ||
      !/^[a-f0-9]{64}$/.test(entry.sourceHash) ||
      typeof entry.contentHash !== "string" ||
      !/^[a-f0-9]{64}$/.test(entry.contentHash) ||
      !Array.isArray(entry.vector)
    )
      throw new Error("Invalid visual entry");
    entry.vector = normalizeVector(entry.vector);
  }
  const identities = new Set(
    index.entries.map((e) => `${e.productId}:${e.imageId}`),
  );
  if (
    identities.size !== index.entries.length ||
    new Set(index.entries.map((e) => e.productId)).size > index.eligibleProducts
  ) {
    throw new Error("Invalid visual index counts");
  }
  return index;
}
export async function readIndex(): Promise<VisualIndex> {
  return parseIndex(await readFile(indexPath(), "utf8"));
}
export async function saveIndex(index: VisualIndex): Promise<void> {
  const raw = JSON.stringify(index);
  parseIndex(raw); // Validate the complete candidate before touching the active snapshot.
  await mkdir(cacheDirectory(), { recursive: true });
  const temporary = `${indexPath()}.${process.pid}.tmp`;
  try {
    await writeFile(temporary, raw, { mode: 0o600 });
    // Keep one compatible, validated snapshot for operational rollback.
    const previous = await readIndex().catch(() => null);
    if (previous) await copyFile(indexPath(), `${indexPath()}.previous`);
    await rename(temporary, indexPath());
  } finally {
    await rm(temporary, { force: true });
  }
}
/** Cosine similarity is a ranking signal, not a confidence percentage. */
export function rankVisualMatches(
  query: readonly number[],
  entries: readonly VisualEntry[],
  minimumScore = 0.7,
) {
  const normalized = normalizeVector(query);
  const scores = new Map<string, number>();
  for (const entry of entries) {
    const score = entry.vector.reduce(
      (sum, n, i) => sum + n * normalized[i],
      0,
    );
    if (score >= minimumScore && score > (scores.get(entry.productId) ?? -1))
      scores.set(entry.productId, score);
  }
  return [...scores]
    .map(([productId, score]) => ({ productId, score }))
    .sort(
      (a, b) => b.score - a.score || a.productId.localeCompare(b.productId),
    );
}
