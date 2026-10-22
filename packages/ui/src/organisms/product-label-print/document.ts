import { escapeHtml } from "./html";
import { renderThermalLabel, thermalLabelCss } from "./thermal-label";
import {
  calculatePrintJob,
  chunkLabels,
  type LabelPrintSettings,
  type ProductLabelValue,
} from "./layout";
const CODE128_B_START = 104;
const CODE128_PATTERNS = [
  "212222",
  "222122",
  "222221",
  "121223",
  "121322",
  "131222",
  "122213",
  "122312",
  "132212",
  "221213",
  "221312",
  "231212",
  "112232",
  "122132",
  "122231",
  "113222",
  "123122",
  "123221",
  "223211",
  "221132",
  "221231",
  "213212",
  "223112",
  "312131",
  "311222",
  "321122",
  "321221",
  "312212",
  "322112",
  "322211",
  "212123",
  "212321",
  "232121",
  "111323",
  "131123",
  "131321",
  "112313",
  "132113",
  "132311",
  "211313",
  "231113",
  "231311",
  "112133",
  "112331",
  "132131",
  "113123",
  "113321",
  "133121",
  "313121",
  "211331",
  "231131",
  "213113",
  "213311",
  "213131",
  "311123",
  "311321",
  "331121",
  "312113",
  "312311",
  "332111",
  "314111",
  "221411",
  "431111",
  "111224",
  "111422",
  "121124",
  "121421",
  "141122",
  "141221",
  "112214",
  "112412",
  "122114",
  "122411",
  "142112",
  "142211",
  "241211",
  "221114",
  "413111",
  "241112",
  "134111",
  "111242",
  "121142",
  "121241",
  "114212",
  "124112",
  "124211",
  "411212",
  "421112",
  "421211",
  "212141",
  "214121",
  "412121",
  "111143",
  "111341",
  "131141",
  "114113",
  "114311",
  "411113",
  "411311",
  "113141",
  "114131",
  "311141",
  "411131",
  "211412",
  "211214",
  "211232",
  "2331112",
] as const;
const MGL_LABEL_LOGO_SVG = `
  <svg viewBox="0 0 125 41" role="img" aria-label="MGL" xmlns="http://www.w3.org/2000/svg">
    <path fill="#ffffff" d="M5.5 31.5V9.4c0-2 1.6-3.5 3.7-3.5h3.5c1.2 0 2.2.4 3 1.3l12.7 12.1L41.1 7.2c.9-.9 1.9-1.3 3.1-1.3h3.5c2.1 0 3.7 1.5 3.7 3.5v22.1h-9.2V18.9L31.5 29.2c-.9.9-1.9 1.3-3.1 1.3s-2.2-.4-3.1-1.3L14.7 18.9v12.6H5.5Z"/>
    <path fill="#ffffff" d="M73.1 32.4c-13.7 0-23.3-6.1-23.3-13.7S59.2 5 72.7 5c8.2 0 15.1 2.5 19.1 6.5l-7.1 4.4c-2.5-2.3-6.7-3.6-11.8-3.6-7.8 0-13.2 2.8-13.2 6.4 0 3.8 5.6 6.7 13.5 6.7 4.8 0 8.6-.9 11-2.6H72.3v-6.3h22.4v2.7c0 8-8.7 13.2-21.6 13.2Z"/>
    <path fill="#1b4dff" d="M66.8 18.8c5.7-3.2 12.6-4.6 21.2-4.2-3.7 2.8-8.2 5.1-13.4 6.8-3.1 1-6.7.1-7.8-2.6Z"/>
    <path fill="#ffffff" d="M94 31.5V6h9.9v18.4h21.1v7.1H94Z"/>
  </svg>
`;

export function buildLabelDocument(
  labels: ProductLabelValue[],
  settings: LabelPrintSettings,
): string {
  const layout = calculatePrintJob(settings, labels.length);
  if (!layout.fitsOnPage)
    throw new Error("Шошго цаасны хэвлэх талбайд багтахгүй байна.");
  const pageMarkup = layout.thermal
    ? `<section class="thermal-roll">${labels.map((label) => `<div class="roll-item">${renderThermalLabel(label, MGL_LABEL_LOGO_SVG, renderBarcodeMarkup(label.code))}</div>`).join("")}</section>`
    : chunkLabels(labels, layout.labelsPerPage).map(renderPrintPage).join("");
  const labelScale = Math.min(
    1.5,
    layout.labelWidth / 144.5,
    layout.labelHeight / 67.3,
  );
  return `
    <!doctype html><html lang="mn">
      <head>
        <meta charset="utf-8" /><title>MGL price labels</title>
        <style>
          @page { size: ${layout.paperWidth}mm ${layout.documentHeight}mm; margin: ${layout.thermal ? 0 : settings.margin}mm; }
          * { box-sizing: border-box; }
          html {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          body {
            margin: 0;
            background: #ffffff;
            color: #002b52;
            font-family: Arial, Helvetica, sans-serif;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .sheet {
            width: ${layout.printableWidth}mm;
            height: ${layout.printableHeight}mm;
            display: grid;
            grid-template-columns: repeat(${layout.columns}, ${layout.labelWidth}mm);
            grid-auto-rows: ${layout.labelHeight}mm;
            align-content: start;
            justify-content: start;
            gap: ${settings.gap}mm;
            margin: 0;
            background: #ffffff;
            break-after: page;
            page-break-after: always;
          }
          .sheet:last-child { break-after: auto; page-break-after: auto; }
          .label {
            width: ${layout.labelWidth}mm;
            height: ${layout.labelHeight}mm;
            min-width: 0;
            min-height: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border: 0.18mm solid #c9d1dc;
            background: #ffffff;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .brand {
            height: ${13.5 * labelScale}mm;
            display: flex;
            align-items: center;
            padding: 0 ${6 * labelScale}mm;
            background: #002b52;
            background-color: #002b52;
            box-shadow: inset 0 0 0 1000px #002b52;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .logo {
            display: block;
            width: ${31 * labelScale}mm;
            height: auto;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .logo svg {
            display: block;
            width: ${31 * labelScale}mm;
            height: auto;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .body {
            display: flex;
            min-height: 0;
            flex: 1;
            flex-direction: column;
            padding: ${1.5 * labelScale}mm ${2.8 * labelScale}mm ${2.4 * labelScale}mm;
            color: #002b52;
          }
          .field-title {
            font-family: Georgia, "Times New Roman", serif;
            font-size: ${5 * labelScale}mm;
            font-weight: 900;
            line-height: 1;
            letter-spacing: ${0.18 * labelScale}mm;
          }
          .name-box,
          .small-box {
            display: flex;
            align-items: center;
            justify-content: center;
            border: ${1.35 * labelScale}mm solid #002b52;
            border-radius: ${3 * labelScale}mm;
            color: #1a1a1a;
            overflow: hidden;
          }
          .name-box {
            height: ${9.5 * labelScale}mm;
            margin-top: ${1.1 * labelScale}mm;
            padding: 0 ${2 * labelScale}mm;
          }
          .name-value {
            max-width: 100%;
            overflow: hidden;
            text-align: center;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: ${4.6 * labelScale}mm;
            font-weight: 900;
            line-height: 1;
          }
          .split-title {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            gap: ${6 * labelScale}mm;
            margin-top: ${1.5 * labelScale}mm;
          }
          .small-boxes {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            gap: ${6 * labelScale}mm;
            margin-top: ${1.1 * labelScale}mm;
          }
          .small-box {
            height: ${14.5 * labelScale}mm;
            padding: 0 ${2 * labelScale}mm;
          }
          .barcode-box {
            flex-direction: column;
            gap: ${0.9 * labelScale}mm;
          }
          .barcode-svg {
            display: block;
            width: 100%;
            height: ${7.3 * labelScale}mm;
          }
          .barcode-svg rect {
            fill: #111111;
          }
          .barcode-text {
            display: block;
            max-width: 100%;
            overflow: hidden;
            color: #111111;
            font-size: ${3.1 * labelScale}mm;
            font-weight: 900;
            line-height: 1;
            text-align: center;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .code-value,
          .price-value {
            max-width: 100%;
            overflow: hidden;
            text-align: center;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-weight: 900;
            line-height: 1;
          }
          .code-value { font-size: ${3.6 * labelScale}mm; }
          .price-value { font-size: ${4.6 * labelScale}mm; }
          .label.empty .name-value,
          .label.empty .code-value,
          .label.empty .price-value { color: transparent; }
          @media screen {
            body { width: ${layout.paperWidth}mm; }
            .sheet { margin: ${settings.margin}mm; }
          }
          @media print {
            body { background: #ffffff; }
            .sheet { margin: 0; }
            .brand {
              background: #002b52 !important;
              background-color: #002b52 !important;
              box-shadow: inset 0 0 0 1000px #002b52 !important;
            }
            .logo svg,
            .logo path {
              print-color-adjust: exact !important;
              -webkit-print-color-adjust: exact !important;
            }
            .barcode-svg rect { fill: #111111 !important; }
          }
          ${
            layout.thermal
              ? `
            html, body { width: ${layout.paperWidth}mm; }
            body { color: #111; }
            .thermal-roll { display: flex; flex-direction: column; gap: ${settings.gap}mm; width: ${layout.paperWidth}mm; }
            .roll-item { height: ${layout.paperHeight}mm; padding: ${settings.margin}mm; flex-shrink: 0; break-inside: avoid; page-break-inside: avoid; }
            @media screen {
              .roll-item { position: relative; }
              .roll-item + .roll-item::before { content: ""; position: absolute; top: -${settings.gap / 2}mm; left: 0; right: 0; border-top: 0.2mm dashed #cbd5e1; }
            }
            ${thermalLabelCss(layout)}
          `
              : ""
          }
        </style>
      </head>
      <body>
        ${pageMarkup}

      </body>
    </html>
  `;
}

export function printProductLabels(
  labels: ProductLabelValue[],
  settings: LabelPrintSettings,
  onError: (message: string) => void,
): string | null {
  if (!labels.length) return "Хэвлэх бараа сонгоно уу.";
  const html = buildLabelDocument(labels, settings);
  const popup = window.open("", "_blank", "width=1120,height=780");
  if (!popup)
    return "Хэвлэх цонх нээгдсэнгүй. Браузерийн popup зөвшөөрлийг шалгана уу.";
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.addEventListener("afterprint", () => popup.close(), { once: true });
  void popup.document.fonts.ready
    .then(() => {
      if (popup.closed) return;
      popup.focus();
      popup.print();
    })
    .catch(() => {
      popup.close();
      onError("Хэвлэх цонхыг нээхэд алдаа гарлаа. Дахин оролдоно уу.");
    });
  return null;
}

function renderPrintPage(pageLabels: ProductLabelValue[]) {
  return `
    <section class="sheet">
      ${pageLabels.map((label) => renderPrintLabel(label)).join("")}
    </section>
  `;
}

function renderPrintLabel(label: ProductLabelValue | null) {
  const isEmpty = !label;

  return `
    <article class="label${isEmpty ? " empty" : ""}">
      <div class="brand"><div class="logo">${MGL_LABEL_LOGO_SVG}</div></div>
      <div class="body">
        <div class="field-title">БҮТЭЭГДЭХҮҮНИЙ НЭР:</div>
        <div class="name-box">
          <span class="name-value">${escapeHtml(label?.name ?? "")}</span>
        </div>
        <div class="split-title">
          <div class="field-title">КОД:</div>
          <div class="field-title">${escapeHtml(label?.priceCaption ?? "Үнэ").toUpperCase()}:</div>
        </div>
        <div class="small-boxes">
          <div class="small-box barcode-box">${renderBarcodeMarkup(label?.code ?? "")}</div>
          <div class="small-box"><span class="price-value">${escapeHtml(label?.priceText || "—")}</span></div>
        </div>
      </div>
    </article>
  `;
}

function renderBarcodeMarkup(value: string) {
  const normalized = value.trim();
  if (!normalized) return "";

  const barcode = createCode128Barcode(normalized);
  if (!barcode) {
    return `<span class="code-value">${escapeHtml(normalized)}</span>`;
  }

  const rects = barcode.bars
    .map(
      (bar) =>
        `<rect x="${bar.x}" y="0" width="${bar.width}" height="50"></rect>`,
    )
    .join("");

  return `
    <svg class="barcode-svg" viewBox="0 0 ${barcode.width} 50" preserveAspectRatio="none" role="img" aria-label="Barcode ${escapeHtml(normalized)}">
      ${rects}
    </svg>
    <span class="barcode-text">${escapeHtml(normalized)}</span>
  `;
}

function createCode128Barcode(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;

  const values: number[] = [CODE128_B_START];
  for (const char of normalized) {
    const code = char.charCodeAt(0);
    if (code < 32 || code > 127) return null;
    values.push(code - 32);
  }

  const checksum =
    values.reduce(
      (sum, value, index) => (index === 0 ? value : sum + value * index),
      0,
    ) % 103;
  values.push(checksum, 106);

  const quietZone = 10;
  const bars: Array<{ x: number; width: number }> = [];
  let x = quietZone;

  values.forEach((codeValue) => {
    const pattern = CODE128_PATTERNS[codeValue];
    if (!pattern) return;

    Array.from(pattern).forEach((moduleWidth, index) => {
      const width = Number(moduleWidth);
      if (index % 2 === 0) {
        bars.push({ x, width });
      }
      x += width;
    });
  });

  return { bars, width: x + quietZone };
}

export { renderPrintLabel as renderProductLabelMarkup };
