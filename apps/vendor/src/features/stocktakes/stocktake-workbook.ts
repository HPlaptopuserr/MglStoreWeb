import ExcelJS from "exceljs";
import { normalizePosMeasureUnit, type StocktakeDetail } from "@mgl/types";
import {
  storedQuantity,
  stocktakeLineName,
  stocktakeLineBarcode,
} from "./stocktake-model";

export function buildStocktakeWorkbook(session: StocktakeDetail) {
  if (session.status !== "APPROVED")
    throw new Error("Зөвхөн баталгаажсан тооллогын тайлан татах боломжтой.");
  if (!session.lines.length) throw new Error("Тайланд оруулах бараа алга.");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MGL Store";
  const sheet = workbook.addWorksheet("Тооллогын тайлан", {
    views: [{ state: "frozen", ySplit: 1, xSplit: 2 }],
  });
  sheet.addTable({
    name: "StocktakeReport",
    ref: "A1",
    headerRow: true,
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: [
      "№",
      "Барааны нэр",
      "Баркод",
      "SKU код",
      "Нэгж",
      "Тооллогын өмнөх үлдэгдэл",
      "Тооллогын дараах үлдэгдэл",
      "Зөрүү",
      "Тайлбар",
    ].map((name) => ({ name, filterButton: true })),
    rows: session.lines.map((line, index) => {
      const before = storedQuantity(line.expected, line.unit);
      // Uncounted partial-stocktake lines are unchanged, never zeroed.
      const after = storedQuantity(line.counted ?? line.expected, line.unit);
      return [
        index + 1,
        stocktakeLineName(line),
        stocktakeLineBarcode(line) ?? "",
        line.product?.sku ?? "",
        normalizePosMeasureUnit(line.unit) === "kg" ? "кг" : "ш",
        before,
        after,
        storedQuantity(
          (line.counted ?? line.expected) - line.expected,
          line.unit,
        ),
        line.counted === null ? "Тоолоогүй — өөрчлөгдөөгүй" : line.note,
      ];
    }),
  });
  [7, 42, 24, 24, 9, 25, 25, 16, 48].forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  for (const index of [3, 4]) sheet.getColumn(index).numFmt = "@";
  for (const index of [6, 7, 8])
    sheet.getColumn(index).numFmt = "#,##0.###;[Red]-#,##0.###";
  sheet.getRow(1).height = 36;
  sheet.getRow(1).alignment = { vertical: "middle", wrapText: true };
  const info = workbook.addWorksheet("Мэдээлэл");
  info.columns = [{ width: 28 }, { width: 80 }];
  info.addRows([
    ["Тооллого", session.title],
    ["Сан", session.warehouse?.name ?? "Агуулахад холбоогүй бараа"],
    [
      "Баталгаажсан огноо",
      session.approvedAt
        ? new Date(session.approvedAt).toLocaleString("mn-MN", {
            timeZone: "Asia/Ulaanbaatar",
          })
        : "",
    ],
    ["Барааны тоо", session.lines.length],
    [
      "Тайлбар",
      "Үлдэгдэл нь баталгаажсан тооллогын хадгалсан тоо. SKU нь одоогийн барааны бүртгэлээс авсан код.",
    ],
  ]);
  info.getColumn(2).alignment = { wrapText: true, vertical: "top" };
  info.getRow(5).height = 42;
  return workbook;
}

export async function downloadStocktake(session: StocktakeDetail) {
  const buffer = await buildStocktakeWorkbook(session).xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(buffer)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${session.title.replace(/[<>:"/\\|?*\x00-\x1f]/g, "-").slice(0, 100) || "Тооллого"}.xlsx`;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
