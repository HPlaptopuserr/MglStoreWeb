import type { Workbook, TableColumnProperties } from "exceljs";

export type SalesExcelRow = Record<string, string | number>;
const moneyColumns = new Set([
  "Нийт өртөг",
  "Нийт өртөг (борлуулалтын үеийн)",
  "Хөнгөлөлт",
  "Борлуулалтын дүн",
  "Барааны ашиг",
  "НӨАТ",
  "Хотын татвар",
  "Барааны дүн",
  "Татвар",
  "Нийт төлөх",
  "Төлбөрийн дүн",
]);
const costColumns = new Set([
  "Нийт өртөг",
  "Нийт өртөг (борлуулалтын үеийн)",
  "Барааны ашиг",
]);
const isPercentage = (header: string) => header.endsWith("(%)");

export function addStyledSalesSheet(
  workbook: Workbook,
  name: string,
  data: readonly SalesExcelRow[],
  tableIndex: number,
  scope: string,
  missingCosts: boolean,
) {
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1, xSplit: 1, showGridLines: false }],
  });
  const headers = Object.keys(data[0] || {});
  if (!headers.length) return;
  sheet.getCell("A1").note =
    `${scope}\nБарааны ашиг = борлуулалтын дүн − авсан өртөг. Үйл ажиллагааны зардлыг хасаагүй.${missingCosts ? " Өртөг дутуу мөрүүдийн ашиг тооцогдоогүй." : ""}`;
  const units = new Set(data.map((row) => row["Нэгж"]).filter(Boolean));
  const columns: TableColumnProperties[] = headers.map((header, index) => ({
    name: header,
    filterButton: true,
    ...(index === 0
      ? { totalsRowLabel: "НИЙТ" }
      : missingCosts && costColumns.has(header)
        ? { totalsRowLabel: "Мэдээлэл дутуу" }
        : moneyColumns.has(header) ||
            (header === "Зарагдсан тоо хэмжээ" && units.size === 1)
          ? { totalsRowFunction: "sum" as const }
          : {}),
  }));
  sheet.addTable({
    name: `SalesReport${tableIndex}`,
    ref: "A1",
    headerRow: true,
    totalsRow: true,
    style: { theme: "TableStyleLight1", showRowStripes: true },
    columns,
    rows: data.map((row) =>
      headers.map((header) =>
        typeof row[header] === "number" && isPercentage(header)
          ? row[header] / 100
          : row[header],
      ),
    ),
  });
  headers.forEach((header, index) => {
    const column = sheet.getColumn(index + 1);
    column.width = Math.min(
      40,
      Math.max(header.length + 2, header === "Бараа" ? 32 : 18),
    );
    column.alignment = { vertical: "middle", horizontal: "left" };
    column.numFmt = isPercentage(header)
      ? "0.00%;[Red](0.00%)"
      : header.includes("үнэ") ||
          (header.includes("өртөг") && !header.includes("мөр")) ||
          moneyColumns.has(header)
        ? '#,##0.00 "₮";[Red](#,##0.00) "₮"'
        : header === "Зарагдсан тоо хэмжээ"
          ? "#,##0.###"
          : "General";
    if (
      isPercentage(header) ||
      moneyColumns.has(header) ||
      header.includes("үнэ") ||
      (header.includes("өртөг") && !header.includes("мөр")) ||
      header === "Зарагдсан тоо хэмжээ" ||
      header === "Баримтын тоо"
    )
      column.alignment = { vertical: "middle", horizontal: "right" };
    if (header === "SKU" || header === "Баркод" || header.includes("ID"))
      column.numFmt = "@";
    if (
      moneyColumns.has(header) ||
      (header === "Зарагдсан тоо хэмжээ" && units.size === 1)
    ) {
      const numeric = data
        .map((row) => row[header])
        .filter((value): value is number => typeof value === "number");
      const footer = sheet.getCell(2 + data.length, index + 1);
      if (missingCosts && costColumns.has(header))
        footer.value = "Мэдээлэл дутуу";
      else
        footer.value = {
          formula: `SUBTOTAL(109,${column.letter}2:${column.letter}${1 + data.length})`,
          result: numeric.reduce((sum, value) => sum + value, 0),
        };
    }
  });
  const footerRow = data.length + 2;
  const profitIndex = headers.indexOf("Барааны ашиг") + 1;
  const revenueIndex = headers.indexOf("Борлуулалтын дүн") + 1;
  const costIndex =
    headers.findIndex(
      (header) =>
        header === "Нийт өртөг" || header === "Нийт өртөг (борлуулалтын үеийн)",
    ) + 1;
  headers.forEach((header, index) => {
    if (!isPercentage(header) || !profitIndex) return;
    const cell = sheet.getCell(footerRow, index + 1);
    if (missingCosts) {
      cell.value = "Мэдээлэл дутуу";
      return;
    }
    const denominatorIndex =
      header === "Ашгийн хувь (%)" ? revenueIndex : costIndex;
    if (!denominatorIndex) return;
    const denominatorHeader = headers[denominatorIndex - 1];
    const denominator = data.reduce(
      (sum, row) =>
        sum +
        (typeof row[denominatorHeader] === "number"
          ? row[denominatorHeader]
          : 0),
      0,
    );
    const profit = data.reduce(
      (sum, row) =>
        sum +
        (typeof row["Барааны ашиг"] === "number" ? row["Барааны ашиг"] : 0),
      0,
    );
    const denominatorCell = sheet.getCell(footerRow, denominatorIndex).address;
    const profitCell = sheet.getCell(footerRow, profitIndex).address;
    cell.value = {
      formula: `IF(${denominatorCell}>0,${profitCell}/${denominatorCell},"")`,
      result: denominator > 0 ? profit / denominator : "",
    };
  });
  sheet.getRow(1).height = 44;
  sheet.getRow(1).alignment = { vertical: "middle", wrapText: true };
  sheet.getRow(1).font = { bold: true, color: { argb: "FF0F172A" }, size: 11 };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD1D5DB" },
  };
  for (let index = 2; index < 2 + data.length; index++) {
    sheet.getRow(index).height = 23;
    sheet.getRow(index).font = { name: "Calibri", size: 11 };
    sheet.getRow(index).eachCell((cell, columnIndex) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: columnIndex === 1 ? "FFF3F4F6" : "FFFFFFFF" },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFD1D5DB" } },
        bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
        left: { style: "thin", color: { argb: "FFD1D5DB" } },
        right: { style: "thin", color: { argb: "FFD1D5DB" } },
      };
    });
  }
  const total = sheet.getRow(2 + data.length);
  total.font = { bold: true, color: { argb: "FF0F172A" } };
  total.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE5E7EB" },
  };
  total.height = 30;
  sheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };
}
