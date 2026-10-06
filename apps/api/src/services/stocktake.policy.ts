import type { StocktakeCountEdit, StocktakeKind } from "@mgl/types";

export class StocktakeError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}
export function inputRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new StocktakeError("Хүсэлтийн бүтэц буруу байна");
  return value as Record<string, unknown>;
}
export function parseCountEdits(value: unknown): StocktakeCountEdit[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 500)
    throw new StocktakeError("Нэг удаад 1–500 мөр хадгална");
  const seen = new Set<string>();
  return value.map((item: unknown) => {
    const row = inputRecord(item);
    if (typeof row.id !== "string" || !row.id || seen.has(row.id))
      throw new StocktakeError("Тооллогын мөр давхардсан эсвэл буруу байна");
    seen.add(row.id);
    if (
      row.counted !== null &&
      (typeof row.counted !== "number" ||
        !Number.isInteger(row.counted) ||
        row.counted < 0 ||
        row.counted > 2147483647)
    )
      throw new StocktakeError(
        "Тоо хэмжээ эерэг бүхэл хадгалалтын нэгжээр байна",
      );
    if (typeof row.note !== "string" || row.note.length > 500)
      throw new StocktakeError("Тайлбар 500 тэмдэгтээс хэтрэхгүй байна");
    return {
      id: row.id,
      counted: row.counted as number | null,
      note: row.note.trim(),
    };
  });
}
export function assertReadyForReview(
  kind: StocktakeKind,
  lines: { expected: number; counted: number | null; note: string }[],
) {
  const counted = lines.filter((line) => line.counted !== null);
  if (!counted.length)
    throw new StocktakeError("Доод тал нь нэг бараа тоолно уу");
  if (kind === "FULL" && counted.length !== lines.length)
    throw new StocktakeError(
      "Бүтэн тооллогын бүх барааг тоолно уу. Байхгүй бараанд 0 оруулна.",
    );
  if (
    counted.some((line) => line.counted !== line.expected && !line.note.trim())
  )
    throw new StocktakeError("Зөрүүтэй бараанд шалтгаан бичнэ үү");
}
export function stocktakePermissions(
  actor: {
    role: string;
    organizationId: string | null;
    orgRole: string | null;
    capabilities: string[];
  },
  organizationId: string,
) {
  const admin = actor.role === "ADMIN" || actor.role === "SUPER_ADMIN";
  const member = actor.organizationId === organizationId;
  const canApprove =
    admin ||
    (member &&
      (actor.orgRole === "OWNER" ||
        actor.orgRole === "ADMIN" ||
        actor.capabilities.includes("STOCK_MANAGER")));
  return {
    canApprove,
    canCount:
      canApprove || (member && actor.capabilities.includes("POS_CASHIER")),
  };
}
export function stockChanged(
  before: { expected: number; unit: string | null; stockUpdatedAt: Date },
  after:
    | { expected: number; unit: string | null; stockUpdatedAt: Date }
    | undefined,
) {
  return (
    !after ||
    before.expected !== after.expected ||
    before.unit !== after.unit ||
    before.stockUpdatedAt.getTime() !== after.stockUpdatedAt.getTime()
  );
}
