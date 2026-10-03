import * as XLSX from "xlsx";
import { Prisma, prisma } from "@mgl/database";
import {
  adminSalesStoreSelect,
  salesStoresQuery,
} from "./admin-sales-stores.service";

export type ExportStore = Prisma.SalesVisitLocationGetPayload<{
  select: typeof adminSalesStoreSelect;
}>;
const batchSize = 1000;
const headers = [
  "№",
  "Дэлгүүрийн нэр",
  "Регистр",
  "Хариуцсан ХТ",
  "Холбоо барих хүн",
  "Утас",
  "Имэйл",
  "Хаяг",
  "Төрөл",
  "Бүртгэлийн төлөв",
  "Бүртгэсэн огноо (УБ)",
  "Айлчлал",
  "Өргөрөг",
  "Уртраг",
  "Газрын зураг",
  "Байгууллага",
  "Байгууллагын төлөв",
  "Баталгаажсан",
  "Хариуцсан байгууллага",
  "Шинэчилсэн огноо (УБ)",
];
const dateFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Ulaanbaatar",
  dateStyle: "short",
  timeStyle: "medium",
});
function mapUrl(store: ExportStore): string {
  const { latitude, longitude } = store;
  return Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180 &&
    (latitude !== 0 || longitude !== 0)
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : "";
}

/** A bounded loader keeps database batches small while exporting every matching row. */
export async function buildSalesStoresWorkbook(
  loadBatch: (cursor: string | undefined) => Promise<ExportStore[]>,
) {
  const sheet = XLSX.utils.aoa_to_sheet([headers]);
  let cursor: string | undefined;
  let count = 0;
  while (true) {
    const stores = await loadBatch(cursor);
    if (!stores.length) break;
    if (count + stores.length > 1_048_575)
      throw new Error(
        "Excel-ийн мөрийн хязгаарт хүрлээ. Хугацаа эсвэл хайлтын шүүлтүүрээ нарийсгана уу.",
      );
    for (const store of stores) {
      const vendor = store.vendorOrganization;
      const category = vendor?.businessCategory;
      const url = mapUrl(store);
      // Strings are explicit text cells, never formula cells (including leading =, +, -, @).
      const row = [
        ++count,
        store.name,
        vendor?.taxId ?? "",
        store.assignments
          .map(
            ({ member }) =>
              member.user.profile?.fullName || "Нэр бүртгэгдээгүй",
          )
          .join(", ") || "Хуваарилаагүй",
        store.contactName ?? "",
        store.contactPhone || vendor?.phone || "",
        vendor?.email ?? "",
        store.address,
        category === "market-food-grocery"
          ? "Хүнсний дэлгүүр"
          : category === "other"
            ? "Бусад"
            : (category ?? ""),
        store.isActive ? "Идэвхтэй" : "Идэвхгүй",
        dateFormatter.format(store.createdAt),
        store._count.visits,
        Number.isFinite(store.latitude) ? store.latitude : "",
        Number.isFinite(store.longitude) ? store.longitude : "",
        url,
        vendor?.name ?? "",
        vendor?.status ?? "",
        vendor?.isVerified ? "Тийм" : "Үгүй",
        store.organization.name,
        dateFormatter.format(store.updatedAt),
      ];
      XLSX.utils.sheet_add_aoa(sheet, [row], { origin: -1 });
      if (url)
        sheet[XLSX.utils.encode_cell({ r: count, c: 14 })].l = {
          Target: url,
          Tooltip: "Газрын зураг дээр харах",
        };
    }
    const nextCursor = stores[stores.length - 1].id;
    if (nextCursor === cursor)
      throw new Error("Экспортын хуудаслалт үргэлжилсэнгүй");
    cursor = nextCursor;
  }
  sheet["!autofilter"] = {
    ref: XLSX.utils.encode_range(
      { r: 0, c: 0 },
      { r: count, c: headers.length - 1 },
    ),
  };
  sheet["!cols"] = [
    6, 28, 18, 26, 24, 18, 30, 48, 22, 20, 24, 12, 16, 16, 65, 28, 22, 16, 28,
    24,
  ].map((wch) => ({ wch }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "MGL Store-ууд");
  return workbook;
}

export async function exportAdminSalesStores(
  query: Record<string, unknown>,
): Promise<Buffer> {
  const { where } = salesStoresQuery(query);
  const workbook = await prisma.$transaction(
    (tx) =>
      buildSalesStoresWorkbook((cursor) =>
        tx.salesVisitLocation.findMany({
          where,
          select: adminSalesStoreSelect,
          take: batchSize,
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        }),
      ),
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      timeout: 60000,
    },
  );
  return XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
    compression: true,
  });
}
