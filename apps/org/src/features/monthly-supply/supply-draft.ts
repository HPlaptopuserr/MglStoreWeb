import {
  parseSupplyMonth,
  type SupplyMaterial,
  type SupplyUnit,
  type SupplyPosBinding,
} from "@mgl/types";
export type ReceiptDraft = {
  id: string;
  date: string;
  quantity: string;
  unitPrice: string;
  supplier: string;
};
export type UsageDraft = {
  id: string;
  date: string;
  quantity: string;
  productId: string | null;
  dishName: string;
};
export type MaterialDraft = {
  openingUnitPrice?: string;
  identityLocked?: boolean;
  id: string;
  name: string;
  unit: SupplyUnit;
  openingQuantity: string;
  receipts: ReceiptDraft[];
  usages: UsageDraft[];
};
export const newMaterial = (): MaterialDraft => ({
  id: crypto.randomUUID(),
  name: "",
  unit: "kg",
  openingQuantity: "0",
  receipts: [],
  usages: [],
});
const requiredNumber = (value: string) =>
  value.trim() ? Number(value) : Number.NaN;
export const supplyDraftData = (materials: MaterialDraft[]) => ({
  materials: materials.map((item) => ({
    id: item.id,
    name: item.name,
    unit: item.unit,
    openingQuantity: requiredNumber(item.openingQuantity),
    ...(item.openingUnitPrice === undefined
      ? {}
      : {
          openingUnitPrice: item.openingUnitPrice.trim()
            ? Number(item.openingUnitPrice)
            : null,
        }),
    receipts: item.receipts.map((row) => ({
      ...row,
      quantity: requiredNumber(row.quantity),
      unitPrice: requiredNumber(row.unitPrice),
    })),
    usages: item.usages.map((row) => ({
      ...row,
      quantity: requiredNumber(row.quantity),
    })),
  })),
});
export const parseSupplyDraft = (
  month: string,
  materials: MaterialDraft[],
  posBindings?: SupplyPosBinding[],
) =>
  parseSupplyMonth(month, {
    ...supplyDraftData(materials),
    ...(posBindings === undefined ? {} : { posBindings }),
  });
export const toSupplyDraft = (materials: SupplyMaterial[]): MaterialDraft[] =>
  materials.map((item) => ({
    id: item.id,
    name: item.name,
    unit: item.unit,
    identityLocked: true,
    openingQuantity: String(item.openingQuantity),
    ...(item.openingUnitPrice === undefined
      ? {}
      : {
          openingUnitPrice:
            item.openingUnitPrice === null ? "" : String(item.openingUnitPrice),
        }),
    receipts: item.receipts.map((row) => ({
      ...row,
      quantity: String(row.quantity),
      unitPrice: String(row.unitPrice),
    })),
    usages: item.usages.map((row) => ({
      ...row,
      quantity: String(row.quantity),
    })),
  }));
export function localBusinessDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return `${parts.find((p) => p.type === "year")?.value}-${parts.find((p) => p.type === "month")?.value}-${parts.find((p) => p.type === "day")?.value}`;
}
export function previousSupplyMonth(month: string): string {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 7);
}
