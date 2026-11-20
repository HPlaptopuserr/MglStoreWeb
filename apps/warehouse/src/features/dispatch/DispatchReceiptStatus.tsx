import type { WarehouseDispatchDocument } from "@mgl/types";
import { dispatchDate } from "./dispatch-format";

export function DispatchReceiptStatus({
  document,
  detailed = false,
}: {
  document: WarehouseDispatchDocument;
  detailed?: boolean;
}) {
  if (!document.recipientOrganizationId) return null;
  const accepted = document.receiptStatus === "ACCEPTED";
  return (
    <div
      className={`rounded-lg px-3 py-2 text-xs leading-5 ${accepted ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}
    >
      <p className="font-semibold">
        {accepted
          ? "Дэлгүүр хүлээн авсан"
          : "Дэлгүүрийн зөвшөөрөл хүлээж байна"}
      </p>
      {detailed && (
        <p className="mt-1">
          {accepted
            ? `Бараа дэлгүүрийн бүтээгдэхүүн болон үлдэгдэлд бүртгэгдсэн.${document.acceptedAt ? ` ${dispatchDate(document.acceptedAt)}` : ""}`
            : "Эзэн паданы бараа, тоо ширхгийг тулгаж зөвшөөрсний дараа өөрийн бүтээгдэхүүн болон үлдэгдэлд бүртгэнэ."}
        </p>
      )}
    </div>
  );
}
