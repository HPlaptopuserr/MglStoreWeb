import type { LabelPrintLayout, ProductLabelValue } from "./layout";
import { escapeHtml, formatPriceMarkup } from "./html";

/** Physical units keep the roll preview and the printed price tag identical. */
export function thermalLabelCss(layout: LabelPrintLayout): string {
  const scale = Math.min(1.25, layout.labelHeight / 44);
  return `
    .thermal-label {
      width: ${layout.labelWidth}mm; height: ${layout.labelHeight}mm;
      display: flex; flex-direction: column; justify-content: space-between;
      padding: ${1.1 * scale}mm ${1.2 * scale}mm;
      overflow: hidden; color: #111; background: #fff;
    }
    .thermal-heading { display: flex; align-items: center; justify-content: space-between; gap: 2mm; min-height: ${3.8 * scale}mm; }
    .thermal-logo { width: ${10 * scale}mm; flex-shrink: 0; }
    .thermal-logo svg { display: block; width: 100%; height: auto; }
    .thermal-logo path { fill: #111; }
    .thermal-caption { font-size: ${1.8 * scale}mm; font-weight: 600; letter-spacing: ${0.25 * scale}mm; }
    .thermal-name { margin: 0; height: ${8.2 * scale}mm; font-size: ${3.4 * scale}mm; line-height: 1.18; font-weight: 700; overflow: hidden; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .thermal-price-row { display: flex; align-items: baseline; justify-content: space-between; gap: 2mm; min-height: ${9 * scale}mm; padding-bottom: ${1.3 * scale}mm; border-bottom: 0.2mm solid #111; }
    .thermal-price-caption { font-size: ${2.2 * scale}mm; font-weight: 600; }
    .thermal-price { font-size: ${7.4 * scale}mm; font-weight: 800; line-height: 1; letter-spacing: -${0.2 * scale}mm; font-variant-numeric: tabular-nums; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .price-currency { font-size: 0.58em; margin-left: 0.12em; font-weight: 600; }
    .thermal-code { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: ${1.1 * scale}mm; min-height: ${12.5 * scale}mm; padding: 0 ${0.8 * scale}mm; }
    .thermal-code .barcode-svg { width: 100%; height: ${8.5 * scale}mm; display: block; }
    .thermal-code .barcode-text, .thermal-code .code-value { max-width: 100%; font-size: ${2.3 * scale}mm; line-height: 1; font-weight: 500; letter-spacing: ${0.13 * scale}mm; }
  `;
}

export function renderThermalLabel(
  label: ProductLabelValue,
  logo: string,
  barcode: string,
): string {
  return `<article class="thermal-label">
    <header class="thermal-heading"><div class="thermal-logo">${logo}</div><span class="thermal-caption">ҮНИЙН ШОШГО</span></header>
    <h2 class="thermal-name">${escapeHtml(label.name)}</h2>
    <div class="thermal-price-row"><span class="thermal-price-caption">${escapeHtml(label.priceCaption ?? "Үнэ")}</span><strong class="thermal-price">${formatPriceMarkup(label.priceText || "—")}</strong></div>
    <div class="thermal-code">${barcode}</div>
  </article>`;
}
