import {
  calculateMarginPercent,
  calculateProductReportTotals,
  type ProductReportRow,
} from "./product-report";
import type { BestSellingProduct } from "./best-selling-products";

export interface ProductReportExportOptions {
  organizationName: string;
  products: ProductReportRow[];
  filterDescription: string;
  bestSellingProducts: BestSellingProduct[];
  salesPeriodDescription: string;
}

const money = (value: number) =>
  `${Math.round(value).toLocaleString("mn-MN")} ₮`;

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export function exportProductReportToPdf({
  organizationName,
  products,
  filterDescription,
  bestSellingProducts,
  salesPeriodDescription,
}: ProductReportExportOptions): void {
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    throw new Error("PDF цонх нээгдсэнгүй. Pop-up зөвшөөрлөө шалгана уу.");
  }
  reportWindow.opener = null;

  const totals = calculateProductReportTotals(products);
  const generatedAt = new Date().toLocaleString("mn-MN");
  const rows = products
    .map((product, index) => {
      const costPrice =
        product.costPrice == null ? null : Number(product.costPrice);
      const margin = calculateMarginPercent(product);
      return `<tr>
        <td>${index + 1}</td>
        <td><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.sku || product.barcode || "Кодгүй")}</small></td>
        <td>${escapeHtml(product.businessCategory?.name || "Ангилалгүй")}</td>
        <td class="number">${costPrice == null ? "-" : money(costPrice)}</td>
        <td class="number">${money(Number(product.price) || 0)}</td>
        <td class="number">${product.wholesalePrice == null ? "-" : money(Number(product.wholesalePrice))}</td>
        <td class="number">${Number(product.stock).toLocaleString("mn-MN")} ${product.unit === "kg" ? "кг" : "ш"}</td>
        <td class="number">${margin == null ? "-" : `${margin.toFixed(1)}%`}</td>
        <td>${product.isActive ? "Идэвхтэй" : "Идэвхгүй"}</td>
      </tr>`;
    })
    .join("");
  const bestSellerRows = bestSellingProducts
    .map(
      (product) => `<tr>
        <td>${product.rank}</td><td><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.sku || "Кодгүй")}</small></td>
        <td class="number">${product.quantitySold.toLocaleString("mn-MN")} ${product.unit === "kg" ? "кг" : "ш"}</td>
        <td class="number">${product.salesCount}</td><td class="number">${money(product.revenue)}</td>
      </tr>`,
    )
    .join("");

  reportWindow.document.write(`<!doctype html>
  <html lang="mn"><head><meta charset="utf-8"><title>Бүтээгдэхүүний тайлан</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #0f172a; font-family: Arial, "Helvetica Neue", sans-serif; font-size: 10px; }
    header { display: flex; justify-content: space-between; gap: 24px; padding-bottom: 14px; border-bottom: 2px solid #4f46e5; }
    h1 { margin: 0 0 5px; font-size: 22px; }
    p { margin: 2px 0; color: #475569; }
    .meta { text-align: right; }
    .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 14px 0; }
    .card { padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
    .card span { display: block; color: #64748b; font-size: 9px; }
    .card strong { display: block; margin-top: 4px; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th { padding: 8px 6px; color: #475569; background: #eef2ff; border: 1px solid #cbd5e1; text-align: left; font-size: 9px; }
    td { padding: 7px 6px; border: 1px solid #e2e8f0; vertical-align: top; word-break: break-word; }
    tr:nth-child(even) td { background: #f8fafc; }
    td small { display: block; margin-top: 3px; color: #64748b; }
    .number { text-align: right; white-space: nowrap; }
    h2 { margin: 18px 0 8px; font-size: 15px; }
    footer { margin-top: 10px; color: #64748b; font-size: 9px; }
  </style></head><body>
    <header><div><h1>Бүтээгдэхүүний тайлан</h1><p>${escapeHtml(organizationName || "Байгууллага")}</p></div>
      <div class="meta"><p>Үүсгэсэн: ${escapeHtml(generatedAt)}</p><p>Шүүлтүүр: ${escapeHtml(filterDescription)}</p></div></header>
    <section class="summary">
      <div class="card"><span>Бүтээгдэхүүн</span><strong>${totals.productCount}</strong></div>
      <div class="card"><span>Нийт үлдэгдэл</span><strong>${totals.stockQuantity.toLocaleString("mn-MN")}</strong></div>
      <div class="card"><span>Нөөцийн өртөг</span><strong>${money(totals.inventoryCost)}</strong></div>
      <div class="card"><span>Зарах үнийн дүн</span><strong>${money(totals.inventoryRetailValue)}</strong></div>
      <div class="card"><span>Боломжит нийт ашиг</span><strong>${money(totals.projectedGrossProfit)}</strong></div>
    </section>
    <h2>Хамгийн их зарагдсан бараа</h2>
    <p style="margin-bottom:8px">Хугацаа: ${escapeHtml(salesPeriodDescription)}</p>
    ${bestSellerRows ? `<table><thead><tr><th style="width:6%">№</th><th>Бүтээгдэхүүн</th><th>Зарагдсан</th><th>Борлуулалт</th><th>Орлого</th></tr></thead><tbody>${bestSellerRows}</tbody></table>` : "<p>Сонгосон хугацаанд борлуулалт алга.</p>"}
    <h2>Бүтээгдэхүүний задаргаа</h2>
    <table><thead><tr><th style="width:3%">№</th><th style="width:21%">Бүтээгдэхүүн</th><th style="width:12%">Ангилал</th><th>Авсан үнэ</th><th>Зарах үнэ</th><th>Бөөний үнэ</th><th>Үлдэгдэл</th><th>Ашгийн хувь</th><th>Төлөв</th></tr></thead>
      <tbody>${rows}</tbody></table>
    <footer>Ашгийн тооцоо нь одоогийн үлдэгдэл болон бүртгэлтэй авсан/зарах үнэд үндэслэсэн урьдчилсан тооцоо болно.</footer>
    <script>window.addEventListener("load", () => { window.print(); });<\/script>
  </body></html>`);
  reportWindow.document.close();
}

function safeReportFileName(organizationName: string, extension: string) {
  const organization = (organizationName || "baiguullaga")
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const date = new Date().toISOString().slice(0, 10);
  return `${organization || "baiguullaga"}-buteegdehuunii-tailan-${date}.${extension}`;
}

export async function exportProductReportToExcel({
  organizationName,
  products,
  filterDescription,
  bestSellingProducts,
  salesPeriodDescription,
}: ProductReportExportOptions): Promise<void> {
  const XLSX = await import("xlsx");
  const totals = calculateProductReportTotals(products);
  const generatedAt = new Date().toLocaleString("mn-MN");

  const summaryRows: Array<Array<string | number>> = [
    ["БҮТЭЭГДЭХҮҮНИЙ ТАЙЛАН"],
    ["Байгууллага", organizationName || "Байгууллага"],
    ["Үүсгэсэн", generatedAt],
    ["Шүүлтүүр", filterDescription],
    [],
    ["Үзүүлэлт", "Утга"],
    ["Бүтээгдэхүүний тоо", totals.productCount],
    ["Нийт үлдэгдэл", totals.stockQuantity],
    ["Нөөцийн өртөг", Math.round(totals.inventoryCost)],
    ["Зарах үнийн дүн", Math.round(totals.inventoryRetailValue)],
    ["Боломжит нийт ашиг", Math.round(totals.projectedGrossProfit)],
    [],
    ["ХАМГИЙН ИХ ЗАРАГДСАН БАРАА"],
    ["Хугацаа", salesPeriodDescription],
    ["№", "Бүтээгдэхүүн", "SKU", "Зарагдсан", "Нэгж", "Борлуулалт", "Орлого"],
    ...bestSellingProducts.map((product) => [
      product.rank,
      product.name,
      product.sku || "Кодгүй",
      product.quantitySold,
      product.unit === "kg" ? "кг" : "ш",
      product.salesCount,
      Math.round(product.revenue),
    ]),
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!cols"] = [
    { wch: 24 },
    { wch: 38 },
    { wch: 22 },
    { wch: 14 },
    { wch: 10 },
    { wch: 15 },
    { wch: 18 },
  ];

  const productRows = products.map((product, index) => {
    const costPrice =
      product.costPrice == null ? null : Number(product.costPrice);
    const retailPrice = Number(product.price) || 0;
    const wholesalePrice =
      product.wholesalePrice == null ? null : Number(product.wholesalePrice);
    const stock = Number(product.stock) || 0;
    const margin = calculateMarginPercent(product);
    return {
      "№": index + 1,
      Бүтээгдэхүүн: product.name,
      "SKU / Баркод": product.sku || product.barcode || "Кодгүй",
      Ангилал: product.businessCategory?.name || "Ангилалгүй",
      "Авсан үнэ": costPrice,
      "Зарах үнэ": retailPrice,
      "Бөөний үнэ": wholesalePrice,
      Үлдэгдэл: stock,
      Нэгж: product.unit === "kg" ? "кг" : "ш",
      "Ашгийн хувь": margin == null ? null : Number(margin.toFixed(1)),
      Төлөв: product.isActive ? "Идэвхтэй" : "Идэвхгүй",
    };
  });
  const productsSheet = XLSX.utils.json_to_sheet(productRows);
  const productHeaders = productRows[0] ? Object.keys(productRows[0]) : [];
  productsSheet["!cols"] = productHeaders.map((header) => ({
    wch: Math.min(
      42,
      Math.max(
        header.length + 2,
        ...productRows.map(
          (row) => String(row[header as keyof typeof row] ?? "").length,
        ),
      ),
    ),
  }));
  if (products.length > 0) {
    productsSheet["!autofilter"] = {
      ref: `A1:${XLSX.utils.encode_col(productHeaders.length - 1)}${products.length + 1}`,
    };
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, productsSheet, "Бүтээгдэхүүн");
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Тойм");
  XLSX.writeFile(workbook, safeReportFileName(organizationName, "xlsx"), {
    compression: true,
  });
}
