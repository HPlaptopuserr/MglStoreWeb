import type { PosReceipt } from "@mgl/types";
import type { SalesExportContext } from "./sales-report-workbook";
import { buildSalesExportRows } from "./sales-export-rows";

export type SalesReportView = "summary" | "details";
export type SalesExportView = SalesReportView | "all";

export function buildSalesExportSheets(
  receipts: PosReceipt[],
  view: SalesExportView,
) {
  const rows = buildSalesExportRows(receipts);
  if (!rows.details.length)
    throw new Error("Сонгосон шүүлтүүрт зарагдсан бараа байхгүй байна.");
  const sheets = [
    ...(view !== "details"
      ? [{ name: "Бараагаар нэгтгэл", rows: rows.totals }]
      : []),
    ...(view !== "summary"
      ? [{ name: "Борлуулалтын дэлгэрэнгүй", rows: rows.details }]
      : []),
    ...(view === "all"
      ? [
          { name: "Баримтууд", rows: rows.sales },
          { name: "Төлбөрийн задаргаа", rows: rows.payments },
        ]
      : []),
  ];
  return sheets;
}

export async function exportDailySales(
  receipts: PosReceipt[],
  date: string,
  view: SalesExportView = "all",
  context: SalesExportContext = {},
) {
  const { buildSalesReportWorkbook } = await import("./sales-report-workbook");
  const workbook = buildSalesReportWorkbook(receipts, view, context);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `POS-borluulalt-${view === "summary" ? "negtgel-" : view === "details" ? "delgerengui-" : ""}${date}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
