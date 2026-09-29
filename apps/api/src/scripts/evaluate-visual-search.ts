import "../config/env";
import { readFile, realpath, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@mgl/database";
import { parseVisualDataset } from "../services/visual-search/visual-search-dataset";
import {
  evaluateRetrieval,
  retrievalGate,
  type RetrievalJudgment,
} from "../services/visual-search/visual-search-evaluation";
import {
  contentDigest,
  readIndex,
} from "../services/visual-search/visual-search-index";
import { searchCatalogByImage } from "../services/visual-search/visual-search-service";
import { warmVisualEncoder } from "../services/visual-search/visual-search-encoder";

async function evaluate() {
  const manifest = process.argv[2],
    output = process.argv[3];
  if (!manifest || !output)
    throw new Error(
      "Usage: pnpm visual-search:evaluate manifest.json report.json [--gate]",
    );
  const base = await realpath(path.dirname(path.resolve(manifest)));
  const queries = parseVisualDataset(await readFile(manifest, "utf8"));
  const index = await readIndex();
  const referenceHashes = new Set(
    index.entries.map((entry) => entry.contentHash),
  );
  const queryHashes = new Set<string>();
  const knownIds = new Set(index.entries.map((entry) => entry.productId));
  await warmVisualEncoder();
  const judgments: RetrievalJudgment[] = [];
  for (const query of queries) {
    const imagePath = await realpath(path.resolve(base, query.image));
    if (!imagePath.startsWith(`${base}${path.sep}`))
      throw new Error("Query images must be within the dataset directory");
    if ((await stat(imagePath)).size > 5 * 1024 * 1024)
      throw new Error("Query exceeds 5 MB");
    const bytes = await readFile(imagePath);
    const hash = contentDigest(bytes);
    if (referenceHashes.has(hash) || queryHashes.has(hash))
      throw new Error(
        "Reference-copy or duplicate query: use independent real photos",
      );
    queryHashes.add(hash);
    if (Object.keys(query.grades).some((id) => !knownIds.has(id)))
      throw new Error("Judged product missing from current index");
    if (query.split !== "test") continue;
    const started = performance.now();
    const result = await searchCatalogByImage(bytes);
    judgments.push({
      id: query.id,
      category: query.category,
      grades: query.grades,
      returnedIds: result.productIds,
      durationMs: performance.now() - started,
    });
  }
  const metrics = evaluateRetrieval(judgments);
  const report = {
    evaluatedAt: new Date().toISOString(),
    embeddingVersion: index.embeddingVersion,
    indexedAt: index.updatedAt,
    threshold: 0.7,
    metrics,
    gate: retrievalGate(metrics),
    scope:
      "Warm local search service; excludes upload, HTTP queue and mobile latency. Labels and independent-photo provenance require human review.",
  };
  await writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(report, null, 2));
  if (process.argv.includes("--gate") && !report.gate.passed)
    process.exitCode = 2;
}
evaluate()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Evaluation failed");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
