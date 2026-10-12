import type { StocktakeDetail, StocktakeLineDto } from "@mgl/types";

export type StocktakeReviewFilter =
  | "all"
  | "difference"
  | "changed"
  | "uncounted";

export function matchesReviewFilter(
  line: StocktakeLineDto,
  filter: string,
  changedIds: ReadonlySet<string>,
) {
  switch (filter) {
    case "difference":
      return line.counted !== null && line.counted !== line.expected;
    case "changed":
      return changedIds.has(line.id);
    case "uncounted":
      return line.counted === null;
    default:
      return true;
  }
}

export function stocktakeCompletionIssue(
  session: StocktakeDetail,
): string | null {
  const counted = session.lines.filter((line) => line.counted !== null);
  if (!counted.length) return "Доод тал нь нэг барааг тоолно уу.";
  if (session.kind === "FULL" && counted.length !== session.lines.length)
    return `${session.lines.length - counted.length} барааны бодит тоог оруулна уу.`;
  const missingReasons = counted.filter(
    (line) => line.counted !== line.expected && !line.note.trim(),
  ).length;
  return missingReasons
    ? `${missingReasons} зөрүүтэй бараанд шалтгаан бичнэ үү.`
    : null;
}

/** Publish intermediate versions so retries never replay successful transitions. */
export async function completeStocktake(
  session: StocktakeDetail,
  mutate: (
    session: StocktakeDetail,
    action: "submit" | "approve",
  ) => Promise<StocktakeDetail>,
  onUpdated: (session: StocktakeDetail) => void,
): Promise<StocktakeDetail> {
  if (session.status === "APPROVED") return session;
  if (session.status === "CANCELLED")
    throw new Error("Цуцалсан тооллогыг дуусгах боломжгүй.");
  const issue = stocktakeCompletionIssue(session);
  if (issue) throw new Error(issue);
  let current = session;
  if (current.status === "DRAFT") {
    current = await mutate(current, "submit");
    onUpdated(current);
  }
  current = await mutate(current, "approve");
  onUpdated(current);
  return current;
}
