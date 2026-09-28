import type { PosReceipt } from "@mgl/types";
import { buildSalesExportRows } from "./sales-export-rows";

export async function exportDailySales(receipts: PosReceipt[], date: string) {
  const rows = buildSalesExportRows(receipts);
  if (!rows.details.length)
    throw new Error("Сонгосон шүүлтүүрт зарагдсан бараа байхгүй байна.");
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const sheets = [
    { name: "Бараагаар нэгтгэл", rows: rows.totals },
    { name: "Борлуулалтын дэлгэрэнгүй", rows: rows.details },
    { name: "Баримтууд", rows: rows.sales },
    { name: "Төлбөрийн задаргаа", rows: rows.payments },
    {
      name: "Тайлбар",
      rows: [
        {
          Тайлбар:
            "Цаг нь Asia/Ulaanbaatar бүсээр. Сонгосон өдөр болон ажилтны шүүлтүүр үйлчилнэ. Буцаагдсан баримтыг оруулаагүй.",
        },
        {
          Тайлбар:
            "Үнэ, SKU, баркод, өртөг, татвар нь борлуулалтын үед хадгалсан утга. Ангилал, тайлбар нь одоогийн барааны бүртгэлээс авсан. Хадгалагдаагүй мэдээлэл хоосон байна.",
        },
        {
          Тайлбар:
            "Барааны мөрийн дүнг дэлгэрэнгүй sheet-ээс, баримтын нийт дүнг Баримтууд sheet-ээс, төлбөрийн дүнг Төлбөрийн задаргаа sheet-ээс нэгтгэнэ. Sheet-үүдийн дүнг хооронд нь нэмж болохгүй.",
        },
        {
          Тайлбар:
            "SKU, баркод болон ID нь эхний тэг, урт дугаарыг хадгалах текст төрөлтэй. Холимог төлбөрийн задаргаа хадгалагдаагүй бол зөвхөн баримтын нийт төлбөрийг харуулна.",
        },
      ],
    },
  ];
  for (const { name, rows: data } of sheets) {
    const sheet = XLSX.utils.json_to_sheet(data);
    const headers = Object.keys(data[0] ?? {});
    sheet["!cols"] = headers.map((header) => ({
      wch:
        header === "Тайлбар"
          ? 100
          : header.includes("ID")
            ? 36
            : Math.max(18, Math.min(42, header.length + 4)),
    }));
    if (sheet["!ref"]) sheet["!autofilter"] = { ref: sheet["!ref"] };
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  }
  XLSX.writeFile(workbook, `POS-borluulalt-${date}.xlsx`);
}
