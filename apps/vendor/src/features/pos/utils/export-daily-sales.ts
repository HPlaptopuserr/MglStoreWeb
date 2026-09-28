import type { PosReceipt } from "@mgl/types";

export async function exportDailySales(receipts: PosReceipt[], date: string) {
  const XLSX = await import("xlsx");
  const summary = new Map<
    string,
    { name: string; unit: string; qty: number; amount: number }
  >();
  const details = receipts
    .filter((receipt) => receipt.status === "COMPLETED")
    .flatMap((receipt) =>
      receipt.lines.map((line) => {
        const unit = line.measureUnit || "ш";
        const key = JSON.stringify([line.productId, unit]);
        const row = summary.get(key) || {
          name: line.name,
          unit,
          qty: 0,
          amount: 0,
        };
        row.qty += line.qty;
        row.amount += line.lineTotal;
        summary.set(key, row);
        return {
          Огноо: new Date(receipt.createdAt).toLocaleString("sv-SE", {
            timeZone: "Asia/Ulaanbaatar",
          }),
          Баримт: receipt.receiptNo,
          Салбар: receipt.branchName,
          Бараа: line.name,
          Нэгж: unit,
          "Тоо хэмжээ": line.qty,
          "Нэгж үнэ": line.unitPrice,
          "Борлуулалтын дүн": line.lineTotal,
        };
      }),
    );
  if (!details.length)
    throw new Error("Сонгосон өдөр зарагдсан бараа байхгүй байна.");
  const workbook = XLSX.utils.book_new();
  const totals = [...summary.values()].map((row) => ({
    Бараа: row.name,
    Нэгж: row.unit,
    "Тоо хэмжээ": Math.round(row.qty * 1000) / 1000,
    "Борлуулалтын дүн": Math.round(row.amount * 100) / 100,
  }));
  const summarySheet = XLSX.utils.json_to_sheet(totals);
  summarySheet["!cols"] = [{ wch: 40 }, { wch: 10 }, { wch: 18 }, { wch: 24 }];
  const detailSheet = XLSX.utils.json_to_sheet(details);
  detailSheet["!cols"] = [22, 24, 24, 40, 10, 18, 18, 24].map((wch) => ({
    wch,
  }));
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Бараагаар нэгтгэл");
  XLSX.utils.book_append_sheet(
    workbook,
    detailSheet,
    "Борлуулалтын дэлгэрэнгүй",
  );
  XLSX.writeFile(workbook, `POS-borluulalt-${date}.xlsx`);
}
