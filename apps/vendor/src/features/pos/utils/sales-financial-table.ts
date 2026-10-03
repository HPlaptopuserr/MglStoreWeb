import type { Worksheet } from "exceljs";
import type { summarizeSalesFinancials } from "./sold-product-summary";

type SalesFinancialTotals = ReturnType<typeof summarizeSalesFinancials>;

/** A small financial table below the full product list, on the same sheet. */
export function addSalesFinancialTable(
  sheet: Worksheet,
  totals: SalesFinancialTotals,
  startRow: number,
  scope: string,
) {
  const partial = totals.missingCostCount > 0;
  const metrics: {
    label: string;
    value: number | string;
    percent?: boolean;
  }[] = [
    { label: "Нийт борлуулалт", value: totals.revenue },
    { label: "Нийт хөнгөлөлт", value: totals.discount },
    {
      label: partial ? "Өртөгтэй мөрүүдийн өртөг" : "Нийт авсан өртөг",
      value: totals.knownCost,
    },
    {
      label: partial ? "Өртөгтэй мөрүүдийн ашиг" : "Нийт барааны ашиг",
      value: totals.profit,
    },
    {
      label: partial ? "Өртөгтэй мөрүүдийн ашгийн хувь" : "Ашгийн хувь",
      value: totals.margin == null ? "—" : totals.margin / 100,
      percent: true,
    },
    {
      label: partial
        ? "Өртөгтэй мөрүүдийн өртгийн нэмэгдэл"
        : "Өртгийн нэмэгдэл",
      value: totals.markup == null ? "—" : totals.markup / 100,
      percent: true,
    },
  ];
  if (partial)
    metrics.push({
      label: "Өртөг дутуу борлуулалтын мөр",
      value: totals.missingCostCount,
    });
  sheet.addTable({
    name: `SalesFinancials${sheet.id}`,
    ref: `A${startRow}`,
    headerRow: true,
    style: { theme: "TableStyleLight1", showRowStripes: false },
    columns: [
      { name: "Санхүүгийн нэгтгэл", filterButton: false },
      { name: "Дүн", filterButton: false },
    ],
    rows: metrics.map(({ label, value }) => [label, value]),
  });
  sheet.getCell(startRow, 1).note =
    `${scope}\nБарааны ашиг = борлуулалтын дүн − авсан өртөг. Цалин, түрээс болон бусад зардлыг хасаагүй. Энэ нэгтгэл татсан бүх мөрийг хамарна.`;
  const header = sheet.getRow(startRow);
  header.font = { name: "Calibri", bold: true, size: 11 };
  header.height = 30;
  metrics.forEach((metric, index) => {
    const row = sheet.getRow(startRow + index + 1);
    row.height = 34;
    row.getCell(1).alignment = { wrapText: true, vertical: "middle" };
    row.getCell(2).alignment = { horizontal: "right", vertical: "middle" };
    row.getCell(2).numFmt = metric.percent
      ? "0.00%;[Red](0.00%)"
      : metric.label.includes("мөр") && !metric.label.includes("мөрүүд")
        ? "0"
        : '#,##0.00 "₮";[Red](#,##0.00) "₮"';
  });
}
