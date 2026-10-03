import { Workbook } from "exceljs";
import type { PosReceipt } from "@mgl/types";
import {
  buildSalesExportSheets,
  type SalesExportView,
} from "./export-daily-sales";
import {
  summarizeSoldProducts,
  summarizeSalesFinancials,
} from "./sold-product-summary";
import { addStyledSalesSheet } from "./styled-sales-sheet";
import { addSalesFinancialTable } from "./sales-financial-table";

export interface SalesExportContext {
  from?: string;
  to?: string;
  cashierName?: string;
  test?: boolean;
}
export function buildSalesReportWorkbook(
  receipts: PosReceipt[],
  view: SalesExportView,
  context: SalesExportContext = {},
) {
  const sheets = buildSalesExportSheets(receipts, view);
  const summaries = summarizeSoldProducts(receipts);
  const totals = summarizeSalesFinancials(summaries);
  const completed = receipts.filter(
    (receipt) => receipt.status === "COMPLETED",
  );
  const workbook = new Workbook();
  workbook.creator = "MGL Store";
  workbook.created = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;
  const scope = `${context.test ? "ТЕСТ · " : ""}${view === "summary" ? "Бараагаар нэгтгэл" : view === "details" ? "Борлуулалт бүрээр" : "Борлуулалтын бүх мэдээлэл"} · ${[...new Set(completed.map((receipt) => receipt.branchName))].join(", ")} · ${context.from || "Эхнээс"} – ${context.to || "Өнөөдрийг хүртэл"} · ${context.cashierName || "Бүх ажилтан"}`;
  workbook.title = scope;
  const partial = totals.missingCostCount > 0;
  sheets.forEach((sheet, index) => {
    addStyledSalesSheet(
      workbook,
      sheet.name,
      sheet.rows,
      index + 1,
      scope,
      partial,
    );
    if (index === 0) {
      addSalesFinancialTable(
        workbook.getWorksheet(sheet.name)!,
        totals,
        sheet.rows.length + 5,
        scope,
      );
    }
  });
  workbook.views = [
    {
      x: 0,
      y: 0,
      width: 16000,
      height: 9000,
      visibility: "visible",
      firstSheet: 0,
      activeTab: 0,
    },
  ];
  return workbook;
}
