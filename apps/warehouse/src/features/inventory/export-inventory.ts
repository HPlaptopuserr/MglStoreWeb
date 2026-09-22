import * as XLSX from "xlsx";
import {
  getInventoryStockStatus,
  STOCK_STATUS_LABELS,
  type InventoryItem,
  type StockStatus,
} from "./inventory.types";

interface InventoryExportOptions {
  items: InventoryItem[];
  warehouseName: string;
  search: string;
  status: StockStatus;
  generatedAt?: Date;
}

export function createInventoryWorkbook({
  items,
  warehouseName,
  search,
  status,
  generatedAt = new Date(),
}: InventoryExportOptions): XLSX.WorkBook {
  const rows = items.map((item, index) => {
    const price = Number(item.product.price);
    return {
      "№": index + 1,
      Бараа: item.product.name,
      SKU: item.product.sku || "",
      Баркод: item.product.barcode || "",
      Байрлал: item.location || "Байрлалгүй",
      Нөөц: item.quantity,
      Нэгж: item.product.unit || "",
      "Хамгийн бага": item.minQuantity,
      "Хамгийн их": item.maxQuantity,
      "Нэгж үнэ (₮)": price,
      "Нийт үнэ (₮)": item.quantity * price,
      "Багцын дугаар": item.batchNumber || "",
      "Дуусах огноо": item.expiryDate?.slice(0, 10) || "",
      Төлөв: STOCK_STATUS_LABELS[getInventoryStockStatus(item)],
      Тэмдэглэл: item.note || "",
    };
  });
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = [
    6, 44, 22, 22, 24, 14, 10, 16, 16, 18, 20, 22, 16, 14, 40,
  ].map((wch) => ({ wch }));
  if (rows.length > 0) {
    sheet["!autofilter"] = { ref: `A1:O${rows.length + 1}` };
    rows.forEach((_, index) => {
      for (const column of ["F", "H", "I", "J", "K"]) {
        const cell = sheet[`${column}${index + 2}`] as
          | XLSX.CellObject
          | undefined;
        if (cell?.t === "n") cell.z = "#,##0.##";
      }
    });
  }

  const summary = XLSX.utils.aoa_to_sheet([
    ["НӨӨЦИЙН ТАЙЛАН"],
    ["Агуулах", warehouseName],
    ["Үүсгэсэн", generatedAt.toLocaleString("mn-MN")],
    ["Хайлт", search || "Бүгд"],
    ["Төлөв", STOCK_STATUS_LABELS[status]],
    [],
    ["Нийт бараа", items.length],
    ["Нийт нөөц", items.reduce((total, item) => total + item.quantity, 0)],
    [
      "Нийт үнэ (₮)",
      rows.reduce((total, row) => total + row["Нийт үнэ (₮)"], 0),
    ],
  ]);
  summary["!cols"] = [{ wch: 24 }, { wch: 48 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Нөөц");
  XLSX.utils.book_append_sheet(workbook, summary, "Тойм");
  return workbook;
}

export function exportInventoryToExcel(options: InventoryExportOptions): void {
  const generatedAt = options.generatedAt ?? new Date();
  const warehouseName =
    options.warehouseName
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "warehouse";
  XLSX.writeFile(
    createInventoryWorkbook({ ...options, generatedAt }),
    `${warehouseName}-inventory-${generatedAt.toISOString().slice(0, 10)}.xlsx`,
    { compression: true },
  );
}
