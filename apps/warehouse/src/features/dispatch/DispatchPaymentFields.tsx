import type {
  WarehouseDispatchPaymentMethod,
  WarehouseDispatchPaymentStatus,
} from "@mgl/types";
import { dispatchPaymentMethods } from "./dispatch-payment";

export function DispatchPaymentFields({
  status,
  method,
  note,
  onStatus,
  onMethod,
  onNote,
}: {
  status: WarehouseDispatchPaymentStatus | "";
  method: WarehouseDispatchPaymentMethod | "";
  note: string;
  onStatus: (value: WarehouseDispatchPaymentStatus | "") => void;
  onMethod: (value: WarehouseDispatchPaymentMethod | "") => void;
  onNote: (value: string) => void;
}) {
  const selectClass =
    "mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-bold text-slate-950">Төлбөрийн мэдээлэл</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-slate-600">
          Төлбөрийн төлөв · заавал
          <select
            required
            value={status}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "" || value === "PAID" || value === "CREDIT")
                onStatus(value);
            }}
            className={selectClass}
          >
            <option value="">Сонгоно уу</option>
            <option value="PAID">Төлсөн</option>
            <option value="CREDIT">Зээлээр</option>
          </select>
        </label>
        {status === "PAID" && (
          <label className="block text-xs font-semibold text-slate-600">
            Төлбөрийн арга · заавал
            <select
              required
              value={method}
              onChange={(event) =>
                onMethod(
                  dispatchPaymentMethods.find(
                    (item) => item.value === event.target.value,
                  )?.value ?? "",
                )
              }
              className={selectClass}
            >
              <option value="">Сонгоно уу</option>
              {dispatchPaymentMethods.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
          Төлбөрийн тайлбар{" "}
          <span className="font-normal text-slate-400">· сонголттой</span>
          <textarea
            value={note}
            onChange={(event) => onNote(event.target.value)}
            maxLength={500}
            rows={2}
            placeholder={
              status === "CREDIT"
                ? "Төлөх хугацаа, тохиролцоо…"
                : "Банк, гүйлгээний дугаар, бусад тайлбар…"
            }
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>
    </section>
  );
}
