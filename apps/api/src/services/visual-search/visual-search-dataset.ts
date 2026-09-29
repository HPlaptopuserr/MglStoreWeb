export interface VisualEvaluationQuery {
  id: string;
  image: string;
  category: string;
  group: string;
  split: "calibration" | "test";
  source: "camera" | "screenshot" | "negative";
  grades: Record<string, 1 | 2>;
}

export function parseVisualDataset(raw: string): VisualEvaluationQuery[] {
  const value: unknown = JSON.parse(raw);
  if (
    !value ||
    typeof value !== "object" ||
    !("version" in value) ||
    value.version !== 1 ||
    !("queries" in value) ||
    !Array.isArray(value.queries) ||
    value.queries.length < 1 ||
    value.queries.length > 10000
  ) {
    throw new Error(
      "Provide a version 1 manifest with 1–10,000 independent real queries",
    );
  }
  const ids = new Set<string>();
  const groups = new Map<string, string>();
  return value.queries.map((row: unknown) => {
    if (!row || typeof row !== "object") throw new Error("Invalid query");
    const query = row as Record<string, unknown>;
    for (const field of ["id", "image", "category", "group"]) {
      if (typeof query[field] !== "string" || !query[field].trim())
        throw new Error(`Missing ${field}`);
    }
    if (
      !["calibration", "test"].includes(String(query.split)) ||
      !["camera", "screenshot", "negative"].includes(String(query.source)) ||
      !query.grades ||
      typeof query.grades !== "object" ||
      Array.isArray(query.grades) ||
      Object.values(query.grades).some((grade) => grade !== 1 && grade !== 2)
    )
      throw new Error("Invalid evaluation labels");
    const result = query as unknown as VisualEvaluationQuery;
    if (ids.has(result.id)) throw new Error("Duplicate query id");
    if (groups.has(result.group) && groups.get(result.group) !== result.split)
      throw new Error("Calibration/test group leakage");
    if (
      (result.source === "negative") !==
      (Object.keys(result.grades).length === 0)
    )
      throw new Error("Negative labels must contain no useful products");
    ids.add(result.id);
    groups.set(result.group, result.split);
    return result;
  });
}
