import { normalizeMasterName } from "../master-product.service";

export interface CatalogSource {
  id: string;
  organizationId: string;
  name: string;
  barcode: string | null;
  unit: string | null;
  categoryName: string | null;
  imageUrl: string | null;
  masterProductId: string | null;
  isActive: boolean;
  isRestaurantMenuItem: boolean;
  reviewStatus: string;
  updatedAt: string;
}
export interface ExistingMaster {
  id: string;
  canonicalName: string;
  barcode: string | null;
  unit: string | null;
  sourceProductId: string | null;
  status: string;
}
export interface CatalogCandidate {
  action: "CREATE" | "EXISTS" | "REVIEW";
  reason: string;
  sourceIds: string[];
  originalNames: string[];
  canonicalName: string;
  normalizedName: string;
  barcode: string | null;
  unit: string | null;
  categoryName: string | null;
  imageUrl: string | null;
  existingMasterId: string | null;
}

/** Cosmetic edits only: never invent a brand, size, flavor or spelling correction. */
export function cleanCatalogName(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(
      /(\d)\s*(ml|мл|kg|кг|гр|g|г|l|л)(?=$|[\s,;)])/giu,
      (_match: string, amount: string, unit: string) =>
        `${amount} ${{ ml: "мл", kg: "кг", g: "г", гр: "г", l: "л" }[unit.toLowerCase()] ?? unit.toLowerCase()}`,
    );
}
export function cleanCatalogUnit(value: string | null): string | null {
  if (!value?.trim()) return null;
  const unit = value.normalize("NFKC").trim().toLowerCase();
  const units: Record<string, string> = {
    шт: "ш",
    ширхэг: "ш",
    pcs: "ш",
    kg: "кг",
    g: "г",
    гр: "г",
    l: "л",
    ml: "мл",
  };
  return units[unit] ?? unit;
}
export function globalBarcode(value: string | null): string | null {
  const barcode = value?.trim() ?? "";
  if (
    !/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(barcode) ||
    /^(\d)\1+$/.test(barcode)
  )
    return null;
  // Restricted-circulation / variable-weight codes are not global product identities.
  if (
    (barcode.length === 13 || barcode.length === 12) &&
    barcode.startsWith("2")
  )
    return null;
  let sum = 0;
  for (
    let i = barcode.length - 2, multiplier = 3;
    i >= 0;
    i--, multiplier = multiplier === 3 ? 1 : 3
  )
    sum += Number(barcode[i]) * multiplier;
  return (10 - (sum % 10)) % 10 === Number(barcode.at(-1)) ? barcode : null;
}
const nameKey = (value: string) =>
  cleanCatalogName(value).toLocaleLowerCase("mn-MN");

export function planCatalogConsolidation(
  sources: CatalogSource[],
  masters: ExistingMaster[],
): CatalogCandidate[] {
  const grouped = new Map<string, CatalogSource[]>();
  const byBarcode = new Map<string, ExistingMaster[]>();
  const bySource = new Map<string, ExistingMaster[]>();
  for (const master of masters) {
    if (master.barcode) {
      const key = master.barcode.trim();
      byBarcode.set(key, [...(byBarcode.get(key) ?? []), master]);
    }
    if (master.sourceProductId)
      bySource.set(master.sourceProductId, [
        ...(bySource.get(master.sourceProductId) ?? []),
        master,
      ]);
  }
  for (const source of sources) {
    const barcode = globalBarcode(source.barcode);
    const key = barcode ? `barcode:${barcode}` : `source:${source.id}`;
    grouped.set(key, [...(grouped.get(key) ?? []), source]);
  }
  return [...grouped.values()].map((group) => {
    group.sort((a, b) => a.id.localeCompare(b.id));
    const first = group[0];
    const canonicalName = cleanCatalogName(first.name);
    const barcode = globalBarcode(first.barcode);
    const unit = cleanCatalogUnit(first.unit);
    const matches = [
      ...new Map(
        [
          ...(barcode ? (byBarcode.get(barcode) ?? []) : []),
          ...group.flatMap((source) => bySource.get(source.id) ?? []),
        ].map((master) => [master.id, master]),
      ).values(),
    ];
    const candidate: CatalogCandidate = {
      action: "CREATE",
      reason: "Баркодын шалгах орон зөв, нэр ба нэгжийн зөрчил илрээгүй",
      sourceIds: group.map((source) => source.id),
      originalNames: [...new Set(group.map((source) => source.name))],
      canonicalName,
      normalizedName: normalizeMasterName(canonicalName),
      barcode,
      unit,
      categoryName: first.categoryName,
      imageUrl: first.imageUrl,
      existingMasterId: null,
    };
    const review = (reason: string): CatalogCandidate => ({
      ...candidate,
      action: "REVIEW",
      reason,
    });
    if (
      group.some(
        (source) => !source.isActive || source.reviewStatus !== "APPROVED",
      )
    )
      return review("Идэвхгүй эсвэл баталгаажаагүй эх бараа");
    if (group.some((source) => source.isRestaurantMenuItem))
      return review("Дэлгүүрийн тусгай хоолны цэс");
    if (!canonicalName || !/\p{L}/u.test(canonicalName))
      return review("Барааны нэр дутуу эсвэл зөвхөн тоо");
    if (!barcode)
      return review(
        "Баркод байхгүй, дотоод код эсвэл GTIN шалгалтад тэнцээгүй",
      );
    if (
      group.some(
        (source) =>
          nameKey(source.name) !== nameKey(canonicalName) ||
          cleanCatalogUnit(source.unit) !== unit,
      )
    )
      return review(
        "Ижил баркодтой боловч нэр, савлагаа эсвэл хэмжих нэгж зөрсөн",
      );
    if (matches.length > 1)
      return review("Нэгдсэн санд олон тохирох бүртгэл байна");
    const existing = matches[0];
    if (existing) {
      if (
        existing.status !== "ACTIVE" ||
        existing.barcode?.trim() !== barcode ||
        nameKey(existing.canonicalName) !== nameKey(canonicalName) ||
        cleanCatalogUnit(existing.unit) !== unit
      )
        return review("Одоо байгаа нэгдсэн барааны мэдээлэлтэй зөрсөн");
      if (
        group.some(
          (source) =>
            source.masterProductId && source.masterProductId !== existing.id,
        )
      )
        return review("Эх бараа өөр нэгдсэн бараатай холбогдсон");
      return {
        ...candidate,
        action: "EXISTS",
        reason: "Нэгдсэн санд бүртгэлтэй — өөрчлөхгүй",
        existingMasterId: existing.id,
      };
    }
    if (group.some((source) => source.masterProductId))
      return review("Өмнөх нэгдсэн барааны холбоосыг нягтлах шаардлагатай");
    return candidate;
  });
}
