import type { ProductHistory, HistoryEntry } from "./product-history.types";
const labels: Record<string, string> = {
  RESTOCK: "Орлого",
  TRANSFER_IN: "Шилжүүлэг орсон",
  TRANSFER_OUT: "Шилжүүлэг гарсан",
  ORDER: "Борлуулалт",
  RETURN: "Буцаалт",
  ORDER_CANCEL: "Захиалга цуцалсан",
  MANUAL_ADJUST: "Тохируулга",
  INITIAL_STOCK: "Эхний үлдэгдэл",
  DAMAGE: "Гэмтэл",
};
const menus: Record<string, string> = {
  CAFE_DAILY_RECEIPT: "Өдрийн тооллого · Орлого",
  WAREHOUSE_GOODS_RECEIPT: "Агуулах · Бараа хүлээн авах",
  POS_GOODS_RECEIPT: "Бараа хүлээн авах",
  WAREHOUSE_TRANSFER: "Агуулах хоорондын шилжүүлэг",
};
const date = (value: string) => new Date(value).toLocaleString("mn-MN");

export function ProductHistorySummary({ data }: { data: ProductHistory }) {
  return (
    <>
      <dl className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-slate-500">Анх бүртгэсэн</dt>
          <dd className="mt-1 font-medium">
            {date(data.registration.createdAt)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Бүртгэсэн хэрэглэгч</dt>
          <dd className="mt-1 font-medium">
            {data.registration.userName ?? "Бүртгэгдээгүй"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Анх бүртгэсэн цэс</dt>
          <dd className="mt-1 font-medium">
            {data.registration.menu ?? "Хуучин бүртгэлд хадгалаагүй"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Орлого авсан баримт</dt>
          <dd className="mt-1 font-semibold">
            {data.summary.arrivalCount} удаа
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Түүхэн орлогын нийт тоо</dt>
          <dd className="mt-1 font-semibold">
            {data.summary.totalReceived.toLocaleString("mn-MN")}{" "}
            {data.summary.unit ?? "ш"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Ирэлт хоорондын дундаж зай</dt>
          <dd className="mt-1 font-semibold">
            {data.summary.averageDays === null
              ? "Хоёр ба түүнээс олон ирэлт шаардлагатай"
              : `${data.summary.averageDays.toFixed(1)} хоног`}
          </dd>
        </div>
      </dl>
      <p className="text-xs text-slate-500">
        Баримттай эерэг орлогуудын түүхэн нийлбэр. Цуцлалт, буцаалтыг хассан
        одоогийн үлдэгдэл биш. Анхны бүртгэсэн цэс болон хөдөлгөөн хийсэн цэс нь
        тусдаа мэдээлэл.
      </p>
    </>
  );
}
export function ProductHistoryTable({ entries }: { entries: HistoryEntry[] }) {
  return entries.length === 0 ? (
    <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
      Энэ бараанд хөдөлгөөний түүх бүртгэгдээгүй байна.
    </p>
  ) : (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500">
          <tr>
            {[
              "Огноо / хэрэглэгч",
              "Үйлдэл / цэс",
              "Хаанаас / баримт",
              "Тоо",
            ].map((label) => (
              <th key={label} scope="col" className="p-3">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.id}
              className="border-t border-slate-100 transition hover:bg-slate-50"
            >
              <td className="p-3">
                {date(entry.date)}
                <p className="mt-1 text-xs text-slate-500">
                  {entry.userName ?? "Хэрэглэгч бүртгэгдээгүй"}
                </p>
              </td>
              <td className="p-3">
                {labels[entry.reason] ?? entry.reason}
                <p className="mt-1 text-xs text-slate-500">
                  {menus[entry.referenceType ?? ""] ?? "Цэс бүртгэгдээгүй"}
                </p>
                {entry.cancelled && (
                  <span className="text-xs text-red-600">
                    Цуцлагдсан баримт
                  </span>
                )}
              </td>
              <td className="max-w-xs break-words p-3">
                {entry.source ?? entry.note ?? "Эх үүсвэр бүртгэгдээгүй"}
                <p className="mt-1 text-xs text-slate-500">
                  {entry.document ?? "Баримтгүй"}{" "}
                  {entry.warehouse && `· ${entry.warehouse}`}
                </p>
              </td>
              <td
                className={`whitespace-nowrap p-3 font-semibold ${entry.quantity > 0 ? "text-emerald-600" : "text-slate-700"}`}
              >
                {entry.quantity > 0 ? "+" : ""}
                {entry.quantity.toLocaleString("mn-MN")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
