import type { LabelPrintLayout } from "./layout";

/** Fill each physical label while keeping type proportional across paper presets. */
export function sheetLabelCss(layout: LabelPrintLayout): string {
  const scale = Math.min(
    1.5,
    layout.labelWidth / 144.5,
    layout.labelHeight / 67.3,
  );
  const brandHeight = 9 * scale;
  // Explicit physical heights also work in Chromium's paginated print layout,
  // where a nested flex item's remaining height can resolve differently.
  const bodyHeight = layout.labelHeight - brandHeight - 0.36;
  const contentHeight = bodyHeight - 5.5 * scale - 4.2 * scale - 6.9 * scale;
  const nameHeight = contentHeight / 2.15;
  const detailsHeight = contentHeight - nameHeight;
  return `
    .label {
      width: ${layout.labelWidth}mm; height: ${layout.labelHeight}mm;
      min-width: 0; min-height: 0; display: block;
      overflow: hidden; border: 0.18mm solid #c9d1dc; background: #fff;
      break-inside: avoid; page-break-inside: avoid;
      print-color-adjust: exact; -webkit-print-color-adjust: exact;
    }
    .brand {
      height: ${brandHeight}mm; display: flex; align-items: center;
      padding: 0 ${4 * scale}mm; background: #002b52;
      box-shadow: inset 0 0 0 1000px #002b52;
      print-color-adjust: exact; -webkit-print-color-adjust: exact;
    }
    .logo, .logo svg { display: block; width: ${24 * scale}mm; height: auto; }
    .body {
      display: grid; height: ${bodyHeight}mm; min-height: 0; min-width: 0;
      grid-template-rows: ${3.45 * scale}mm ${nameHeight}mm ${3.45 * scale}mm ${detailsHeight}mm;
      gap: ${1.4 * scale}mm;
      padding: ${2.5 * scale}mm ${3 * scale}mm ${3 * scale}mm;
      color: #002b52;
    }
    .field-title {
      min-width: 0; font-size: ${3 * scale}mm; font-weight: 700;
      line-height: 1.15; letter-spacing: ${0.12 * scale}mm;
    }
    .name-box, .small-box {
      display: flex; min-width: 0; min-height: 0;
      align-items: center; justify-content: center;
      border: ${0.55 * scale}mm solid #002b52;
      border-radius: ${1.8 * scale}mm; color: #111; overflow: hidden;
      padding: ${1.3 * scale}mm ${2 * scale}mm;
    }
    .name-value {
      max-width: 100%; display: -webkit-box; -webkit-line-clamp: 2;
      -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere;
      text-align: center; font-size: ${6.5 * scale}mm; font-weight: 800; line-height: 1.15;
    }
    .split-title, .small-boxes {
      display: grid; min-height: 0;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
      gap: ${3 * scale}mm;
    }
    .barcode-box { flex-direction: column; gap: ${1 * scale}mm; }
    .barcode-svg { display: block; width: 100%; min-height: 0; height: ${10 * scale}mm; flex-shrink: 0; }
    .barcode-svg rect { fill: #111; }
    .barcode-text, .code-value {
      display: block; max-width: 100%; overflow: hidden; text-overflow: ellipsis;
      white-space: nowrap; color: #111; font-size: ${2.8 * scale}mm;
      font-weight: 600; line-height: 1; text-align: center; flex-shrink: 0;
    }
    .price-value {
      max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      font-size: ${10 * scale}mm; font-weight: 900; line-height: 1.1;
      letter-spacing: -0.04em; font-variant-numeric: tabular-nums;
    }
    .price-value .price-currency { font-size: 0.6em; margin-left: 0.15em; }
    .label.empty .name-value, .label.empty .code-value, .label.empty .price-value { color: transparent; }
  `;
}
