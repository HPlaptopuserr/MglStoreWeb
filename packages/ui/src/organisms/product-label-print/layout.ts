export type LabelPriceMode = "retail" | "wholesale";
export const PRICE_MODE_LABELS: Record<LabelPriceMode, string> = {
  retail: "Энгийн үнэ",
  wholesale: "Бөөний үнэ",
};
export type ProductLabelDraft = ProductLabelValue & {
  qty: number;
  wholesalePriceText: string;
};
export interface ProductLabelValue {
  productId: string;
  name: string;
  code: string;
  priceText: string;
  priceCaption?: string;
}
export interface ProductLabelProduct {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  price?: number | string | null;
  wholesalePrice?: number | string | null;
}
export const PAPER_PRESETS = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  LETTER: { width: 215.9, height: 279.4 },
} as const;
export type PaperPreset = keyof typeof PAPER_PRESETS | "THERMAL" | "CUSTOM";
export interface LabelPrintSettings {
  paperPreset: PaperPreset;
  orientation: "portrait" | "landscape";
  labelWidth: number;
  labelHeight: number;
  customPaperWidth: number;
  customPaperHeight: number;
  thermalWidth: number;
  thermalHeight: number;
  margin: number;
  gap: number;
}
export const DEFAULT_PRINT_SETTINGS: LabelPrintSettings = {
  paperPreset: "A4",
  orientation: "landscape",
  labelWidth: 144.5,
  labelHeight: 67.3,
  customPaperWidth: 210,
  customPaperHeight: 297,
  thermalWidth: 80,
  thermalHeight: 50,
  margin: 4,
  gap: 0,
};
export function calculatePrintLayout(settings: LabelPrintSettings) {
  const thermal = settings.paperPreset === "THERMAL";
  const preset = thermal
    ? { width: settings.thermalWidth, height: settings.thermalHeight }
    : settings.paperPreset === "CUSTOM"
      ? { width: settings.customPaperWidth, height: settings.customPaperHeight }
      : PAPER_PRESETS[settings.paperPreset as keyof typeof PAPER_PRESETS];
  const landscape =
    !thermal &&
    settings.paperPreset !== "CUSTOM" &&
    settings.orientation === "landscape";
  const paperWidth = landscape ? preset.height : preset.width;
  const paperHeight = landscape ? preset.width : preset.height;
  const printableWidth = Math.max(0, paperWidth - settings.margin * 2);
  const printableHeight = Math.max(0, paperHeight - settings.margin * 2);
  const labelWidth = thermal ? printableWidth : settings.labelWidth;
  const labelHeight = thermal ? printableHeight : settings.labelHeight;
  const columns = thermal
    ? 1
    : Math.max(
        1,
        Math.floor(
          (printableWidth + settings.gap + 1e-8) / (labelWidth + settings.gap),
        ),
      );
  const rows = thermal
    ? 1
    : Math.max(
        1,
        Math.floor(
          (printableHeight + settings.gap + 1e-8) /
            (labelHeight + settings.gap),
        ),
      );
  const valid = Object.values(settings).every(
    (value) => typeof value !== "number" || Number.isFinite(value),
  );
  return {
    paperWidth,
    paperHeight,
    printableWidth,
    printableHeight,
    labelWidth,
    labelHeight,
    columns,
    rows,
    labelsPerPage: columns * rows,
    fitsOnPage:
      valid &&
      settings.margin >= 0 &&
      settings.gap >= 0 &&
      labelWidth >= 20 &&
      labelHeight >= 20 &&
      labelWidth <= printableWidth &&
      labelHeight <= printableHeight,
    thermal,
  };
}
export type LabelPrintLayout = ReturnType<typeof calculatePrintLayout>;
export function chunkLabels(labels: ProductLabelValue[], size: number) {
  if (!Number.isInteger(size) || size < 1)
    throw new Error("Invalid labels per page");
  const chunks: ProductLabelValue[][] = [];
  for (let index = 0; index < labels.length; index += size)
    chunks.push(labels.slice(index, index + size));
  return chunks;
}
export function resolveProductLabelCode(product: ProductLabelProduct) {
  const sku = product.sku?.trim();
  if (sku) return { label: "SKU", value: sku };
  return { label: "Barcode", value: product.barcode?.trim() ?? "" };
}
export function formatLabelPrice(value: number | string | null | undefined) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0₮";
  return `${amount.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 2 })}₮`;
}
export function clampQty(value: number) {
  return Number.isFinite(value)
    ? Math.max(1, Math.min(999, Math.floor(value)))
    : 1;
}
export function createDraft(product: ProductLabelProduct): ProductLabelDraft {
  return {
    productId: product.id,
    name: product.name,
    code: resolveProductLabelCode(product).value,
    priceText: productPriceText(product, "retail"),
    wholesalePriceText: productPriceText(product, "wholesale"),
    qty: 1,
  };
}

/** The thermal job is one continuous roll, including every copy in queue order. */
export function calculatePrintJob(
  settings: LabelPrintSettings,
  labelCount: number,
) {
  const layout = calculatePrintLayout(settings);
  const slots = Math.max(1, labelCount);
  return {
    ...layout,
    documentHeight: layout.thermal
      ? slots * layout.paperHeight + (slots - 1) * settings.gap
      : layout.paperHeight,
    pageCount: layout.thermal
      ? Number(labelCount > 0)
      : Math.ceil(labelCount / layout.labelsPerPage),
  };
}

export function productPriceText(
  product: ProductLabelProduct,
  mode: LabelPriceMode,
): string {
  const value = mode === "wholesale" ? product.wholesalePrice : product.price;
  if (
    value == null ||
    String(value).trim() === "" ||
    !Number.isFinite(Number(value)) ||
    Number(value) < 0
  )
    return "";
  return formatLabelPrice(value);
}

export function draftLabelValue(
  draft: ProductLabelDraft,
  mode: LabelPriceMode,
): ProductLabelValue {
  return {
    productId: draft.productId,
    name: draft.name,
    code: draft.code,
    priceText:
      mode === "wholesale" ? draft.wholesalePriceText : draft.priceText,
    priceCaption: PRICE_MODE_LABELS[mode],
  };
}
