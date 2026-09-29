export interface RetrievalJudgment {
  id: string;
  category: string;
  grades: Readonly<Record<string, 1 | 2>>;
  returnedIds: string[];
  durationMs: number;
}

function rate(successes: number, count: number) {
  return count ? Number((successes / count).toFixed(4)) : null;
}

export function evaluateRetrieval(queries: RetrievalJudgment[]) {
  const positive = queries.filter(
    (query) => Object.keys(query.grades).length > 0,
  );
  const exact = positive.filter((query) =>
    Object.values(query.grades).includes(2),
  );
  const negative = queries.filter(
    (query) => Object.keys(query.grades).length === 0,
  );
  const exactHits = exact.filter((query) =>
    query.returnedIds.slice(0, 5).some((id) => query.grades[id] === 2),
  ).length;
  const usefulHits = positive.filter((query) =>
    query.returnedIds.slice(0, 5).some((id) => query.grades[id] > 0),
  ).length;
  const falsePositives = negative.filter(
    (query) => query.returnedIds.length > 0,
  ).length;
  const durations = queries
    .map((query) => query.durationMs)
    .sort((a, b) => a - b);
  const ndcg = positive.map((query) => {
    const gain = (grades: number[]) =>
      grades.reduce(
        (sum, grade, i) => sum + (2 ** grade - 1) / Math.log2(i + 2),
        0,
      );
    const actual = gain(
      query.returnedIds.slice(0, 10).map((id) => query.grades[id] ?? 0),
    );
    const ideal = gain(
      Object.values(query.grades)
        .sort((a, b) => b - a)
        .slice(0, 10),
    );
    return ideal ? actual / ideal : 0;
  });
  const categories = [...new Set(positive.map((query) => query.category))]
    .sort()
    .map((category) => {
      const items = positive.filter((query) => query.category === category);
      return {
        category,
        count: items.length,
        usefulHitAt5: rate(
          items.filter((query) =>
            query.returnedIds.slice(0, 5).some((id) => query.grades[id] > 0),
          ).length,
          items.length,
        ),
      };
    });
  return {
    total: queries.length,
    positiveCount: positive.length,
    exactCount: exact.length,
    negativeCount: negative.length,
    exactRecallAt5: rate(exactHits, exact.length),
    usefulHitAt5: rate(usefulHits, positive.length),
    negativeFalsePositiveRate: rate(falsePositives, negative.length),
    falsePositives,
    ndcgAt10: ndcg.length
      ? ndcg.reduce((a, b) => a + b, 0) / ndcg.length
      : null,
    p95Ms: durations.length
      ? durations[Math.ceil(durations.length * 0.95) - 1]
      : null,
    categories,
  };
}

export function retrievalGate(report: ReturnType<typeof evaluateRetrieval>) {
  const failures: string[] = [];
  if (
    report.positiveCount < 200 ||
    report.negativeCount < 100 ||
    report.exactCount < 100
  )
    failures.push("insufficient_real_queries");
  if ((report.exactRecallAt5 ?? 0) < 0.9) failures.push("exact_recall");
  if ((report.usefulHitAt5 ?? 0) < 0.85) failures.push("useful_hit");
  if ((report.negativeFalsePositiveRate ?? 1) > 0.05)
    failures.push("negative_false_positives");
  if (
    report.categories.length < 5 ||
    report.categories.some(
      (category) => category.count < 20 || (category.usefulHitAt5 ?? 0) < 0.75,
    )
  )
    failures.push("category_coverage_or_quality");
  if (report.p95Ms === null || report.p95Ms > 2000) failures.push("latency");
  return { passed: failures.length === 0, failures };
}
