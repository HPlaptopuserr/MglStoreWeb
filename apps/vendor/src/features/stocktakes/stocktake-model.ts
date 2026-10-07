import { normalizePosMeasureUnit, type StocktakeLineDto } from "@mgl/types";
export const stocktakeStatusLabels = {
  DRAFT: "Тоолж байна",
  REVIEW: "Хяналтад",
  APPROVED: "Баталгаажсан",
  CANCELLED: "Цуцалсан",
};
export const storedQuantity = (value: number, unit: string | null) =>
  value / (normalizePosMeasureUnit(unit) === "kg" ? 1000 : 1);
export function parseCount(value: string, unit: string | null): number | null {
  if (!value.trim()) return null;
  const scale = normalizePosMeasureUnit(unit) === "kg" ? 1000 : 1;
  const number = Number(value);
  const scaled = number * scale;
  if (
    !Number.isFinite(number) ||
    number < 0 ||
    Math.abs(Math.round(scaled) - scaled) > 0.000001 ||
    scaled > 2147483647
  )
    throw new Error(
      scale === 1000
        ? "Кг хэмжээг 0.001 нарийвчлалтай оруулна уу"
        : "Ширхэгийн тоог эерэг бүхэл тоогоор оруулна уу",
    );
  return Math.round(scaled);
}
export function barcodeIndex(lines: StocktakeLineDto[]) {
  const index = new Map<string, StocktakeLineDto[]>();
  for (const line of lines)
    for (const code of new Set(
      [line.barcode, ...line.barcodeAliases]
        .filter((value): value is string => Boolean(value?.trim()))
        .map((value) => value.trim()),
    ))
      index.set(code, [...(index.get(code) ?? []), line]);
  return index;
}

export function matchesStocktakeQuery(
  line: StocktakeLineDto,
  query: string,
): boolean {
  const value = query.trim().toLocaleLowerCase("mn-MN");
  return (
    !value ||
    [line.name, line.barcode, ...line.barcodeAliases].some((text) =>
      text?.toLocaleLowerCase("mn-MN").includes(value),
    )
  );
}

export function newProductSeed(query: string): {
  name: string;
  barcode: string;
} {
  const value = query.trim();
  return /^[0-9]+$/.test(value)
    ? { name: "", barcode: value }
    : { name: value, barcode: "" };
}
