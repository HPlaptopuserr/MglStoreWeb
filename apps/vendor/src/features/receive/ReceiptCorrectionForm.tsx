"use client";
import { useRef, useState } from "react";
import { API, authFetch } from "@/lib/api";
import type { GoodsReceiptDocument } from "./GoodsReceiptDocumentModal";
const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";
export function ReceiptCorrectionForm({
  document,
  onSaved,
  onCancel,
  onBusy,
}: {
  document: GoodsReceiptDocument;
  onSaved: () => void;
  onCancel: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState("");
  return (
    <form
      className="m-4 space-y-4 rounded-xl border border-blue-200 bg-white p-5 sm:m-6"
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending.current) return;
        const data = new FormData(event.currentTarget);
        const items = document.items.map((item) => {
          const sale = Number(data.get(`sale-${item.id}`));
          return {
            id: item.id,
            quantity: Number(data.get(`qty-${item.id}`)),
            unitCost:
              String(data.get(`cost-${item.id}`)).trim() === ""
                ? null
                : Number(data.get(`cost-${item.id}`)),
            ...(sale !== item.salePrice
              ? { salePrice: sale, previousSalePrice: item.salePrice }
              : {}),
          };
        });
        pending.current = true;
        setSaving(true);
        onBusy(true);
        setError("");
        try {
          const response = await authFetch(
            `${API}/pos/goods-receipts/${document.id}`,
            {
              method: "PATCH",
              body: JSON.stringify({
                version: document.version,
                reason: data.get("reason"),
                supplierName: data.get("supplierName"),
                supplierRegisterNo: data.get("supplierRegisterNo"),
                documentNo: data.get("documentNo"),
                note: data.get("note"),
                items,
              }),
            },
          );
          const result = (await response.json()) as { message?: string };
          if (!response.ok)
            throw new Error(result.message || "Засвар хадгалж чадсангүй");
          onSaved();
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Холболт тасарлаа. Баримтыг дахин нээж хадгалагдсан эсэхийг шалгана уу.",
          );
        } finally {
          pending.current = false;
          setSaving(false);
          onBusy(false);
        }
      }}
    >
      <h3 className="font-semibold text-slate-900">Owner · Падаан засах</h3>
      <p className="text-sm text-slate-600">
        Тоо өөрчлөгдвөл зөвхөн зөрүү нь үлдэгдэлд орно. Авсан өртгийн засвар нь
        энэ баримт болон үлдсэн багцад үйлчилнэ; өмнөх борлуулалтын үнэ,
        бүртгэсэн өртгийг өөрчлөхгүй. Давхар орсон мөрийг баталгаажуулсан бол
        тоог 0 болгож цуцална; зарцуулсан хэмжээг хасах боломжгүй.
      </p>
      <fieldset disabled={saving} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["supplierName", "Нийлүүлэгч"],
              ["supplierRegisterNo", "Регистр"],
              ["documentNo", "Падааны дугаар"],
              ["note", "Тайлбар"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-sm">
              {label}
              <input
                className={inputClass}
                name={key}
                defaultValue={document[key] ?? ""}
                required={key === "supplierName"}
                maxLength={
                  key === "note" ? 2000 : key === "supplierName" ? 200 : 100
                }
              />
            </label>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="p-2">Бараа</th>
                <th className="p-2">Хүлээн авсан тоо</th>
                <th className="p-2">Авсан нэгжийн өртөг</th>
                <th className="p-2">Одоогийн зарах үнэ</th>
              </tr>
            </thead>
            <tbody>
              {document.items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="p-2">
                    {item.productName}
                    <span className="block text-xs text-slate-500">
                      {item.barcode} · {item.unit === "kg" ? "кг" : "ш"}
                    </span>
                  </td>
                  <td className="p-2">
                    <input
                      aria-label={`${item.productName} тоо`}
                      name={`qty-${item.id}`}
                      type="number"
                      required
                      min={0}
                      step={item.unit === "kg" ? 0.001 : 1}
                      max={1000000}
                      defaultValue={item.quantity}
                      className={inputClass}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      aria-label={`${item.productName} авсан өртөг`}
                      name={`cost-${item.id}`}
                      type="number"
                      min={0}
                      max={1e9}
                      step="0.01"
                      defaultValue={item.unitCost ?? ""}
                      className={inputClass}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      aria-label={`${item.productName} зарах үнэ`}
                      name={`sale-${item.id}`}
                      type="number"
                      required
                      min={0}
                      max={1e9}
                      step="0.01"
                      defaultValue={item.salePrice}
                      className={inputClass}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <label className="block text-sm font-medium">
          Засварын шалтгаан{" "}
          <textarea
            name="reason"
            required
            maxLength={1000}
            className={inputClass}
            placeholder="Ямар мэдээллийг яагаад засаж байгааг бичнэ үү"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-rose-700">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Хадгалж байна…" : "Засварыг хадгалах"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50"
          >
            Болих
          </button>
        </div>
      </fieldset>
    </form>
  );
}
