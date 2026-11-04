import { posRequest } from "./_pos-client";

type CreditCollection = "credits" | "customers";
type CreditPage<T> = Partial<Record<CreditCollection, T[]>> & {
  nextCursor?: string | null;
};

// Load every page before publishing the list so borrower totals and bulk
// repayments include older credits as well as the most recent ones.
export async function getCreditList<T>(
  collection: CreditCollection,
  filters: URLSearchParams,
): Promise<T[]> {
  const path = collection === "credits" ? "/pos/credit-sales" : "/pos/credit-customers";
  const params = new URLSearchParams(filters);
  params.set("limit", "100");
  params.delete("cursor");
  const entries: T[] = [];
  const seenCursors = new Set<string>();

  while (true) {
    const page = await posRequest<CreditPage<T>>(`${path}?${params.toString()}`);
    const items = page[collection];
    if (!Array.isArray(items)) {
      throw new Error("Зээлийн жагсаалтын хариу буруу байна");
    }
    entries.push(...items);
    if (!page.nextCursor) return entries;
    if (seenCursors.has(page.nextCursor)) {
      throw new Error("Зээлийн жагсаалтыг бүрэн татаж чадсангүй");
    }
    seenCursors.add(page.nextCursor);
    params.set("cursor", page.nextCursor);
  }
}
