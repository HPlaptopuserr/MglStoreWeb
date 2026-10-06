export interface EnrichmentIssue {
  productId: string;
  name: string;
  reason: string;
}
export interface EnrichmentProgress {
  total: number;
  processed: number;
  created: number;
  existing: number;
  skipped: number;
  warehouseProducts: number;
  unitDifferences: number;
  issues: EnrichmentIssue[];
}
export interface EnrichmentBatch extends EnrichmentProgress {
  startedAt: string;
  nextCursor: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

export function parseEnrichmentBatch(
  value: unknown,
  cursor?: string,
  startedAt?: string,
): EnrichmentBatch {
  const invalid = () =>
    new Error("Тулгалтын хариу дутуу эсвэл буруу байна. Дахин тулгана уу.");
  if (!isRecord(value)) throw invalid();
  const {
    total,
    processed,
    created,
    existing,
    skipped,
    warehouseProducts,
    issues,
    nextCursor,
    startedAt: nextStart,
  } = value;
  const unitDifferences = value.unitDifferences ?? 0;
  if (
    !isCount(unitDifferences) ||
    !isCount(total) ||
    !isCount(processed) ||
    !isCount(created) ||
    !isCount(existing) ||
    !isCount(skipped) ||
    !isCount(warehouseProducts) ||
    created + existing + skipped !== processed ||
    warehouseProducts > processed ||
    unitDifferences > existing ||
    processed > total ||
    typeof nextStart !== "string" ||
    !Number.isFinite(Date.parse(nextStart)) ||
    (startedAt !== undefined && startedAt !== nextStart) ||
    !(
      nextCursor === null ||
      (typeof nextCursor === "string" &&
        /^[a-zA-Z0-9-]{1,80}$/.test(nextCursor) &&
        processed > 0 &&
        (!cursor || nextCursor > cursor))
    ) ||
    !Array.isArray(issues) ||
    issues.length !== skipped
  )
    throw invalid();
  const parsedIssues = issues.map((issue: unknown) => {
    if (
      !isRecord(issue) ||
      typeof issue.productId !== "string" ||
      typeof issue.name !== "string" ||
      typeof issue.reason !== "string"
    )
      throw invalid();
    return {
      productId: issue.productId,
      name: issue.name,
      reason: issue.reason,
    };
  });
  return {
    total,
    processed,
    created,
    existing,
    skipped,
    warehouseProducts,
    startedAt: nextStart,
    nextCursor,
    issues: parsedIssues,
    unitDifferences,
  };
}
