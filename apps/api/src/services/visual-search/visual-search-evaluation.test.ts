import assert from "node:assert/strict";
import test from "node:test";
import { evaluateRetrieval, retrievalGate } from "./visual-search-evaluation";
import { parseVisualDataset } from "./visual-search-dataset";

test("quality metrics distinguish exact, useful, negative and insufficient evidence", () => {
  const metrics = evaluateRetrieval([
    {
      id: "one",
      category: "shoe",
      grades: { exact: 2, similar: 1 },
      returnedIds: ["similar", "exact"],
      durationMs: 100,
    },
    {
      id: "two",
      category: "shoe",
      grades: { target: 2 },
      returnedIds: ["unrelated"],
      durationMs: 200,
    },
    {
      id: "three",
      category: "none",
      grades: {},
      returnedIds: ["false-positive"],
      durationMs: 300,
    },
    {
      id: "four",
      category: "none",
      grades: {},
      returnedIds: [],
      durationMs: 400,
    },
  ]);
  assert.equal(metrics.exactRecallAt5, 0.5);
  assert.equal(metrics.usefulHitAt5, 0.5);
  assert.equal(metrics.negativeFalsePositiveRate, 0.5);
  assert.equal(metrics.p95Ms, 400);
  assert.ok(metrics.ndcgAt10! > 0 && metrics.ndcgAt10! < 0.5);
  assert.ok(
    retrievalGate(metrics).failures.includes("insufficient_real_queries"),
  );
  assert.equal(retrievalGate(evaluateRetrieval([])).passed, false);
});

test("dataset rejects split leakage, duplicates and mislabeled negatives", () => {
  const query = {
    id: "q",
    image: "q.jpg",
    category: "shoes",
    group: "family-session-1",
    split: "test",
    source: "camera",
    grades: { p: 2 },
  };
  const manifest = (queries: unknown[]) =>
    JSON.stringify({ version: 1, queries });
  assert.equal(parseVisualDataset(manifest([query])).length, 1);
  assert.throws(
    () => parseVisualDataset(manifest([query, query])),
    /Duplicate/,
  );
  assert.throws(
    () =>
      parseVisualDataset(
        manifest([query, { ...query, id: "q2", split: "calibration" }]),
      ),
    /leakage/,
  );
  assert.throws(
    () => parseVisualDataset(manifest([{ ...query, source: "negative" }])),
    /Negative/,
  );
  assert.throws(() =>
    parseVisualDataset(manifest([{ ...query, grades: { p: 3 } }])),
  );
});
