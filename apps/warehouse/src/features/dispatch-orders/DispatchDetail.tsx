"use client";

import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Package,
  Printer,
  RotateCcw,
  Send,
  Truck,
} from "lucide-react";
import {
  type Dispatch,
  STATUS_MAP,
  STEPS,
  formatMoney,
  paymentOutstanding,
  paymentStatusClass,
  paymentStatusLabel,
  stepIndex,
} from "./dispatch-order.model";

export function DispatchDetail({
  dispatch: d,
  onConfirm,
  onDispatch,
  onCancel,
  onPadaan,
  onInvoice,
  onReturn,
  actionLoading,
}: {
  dispatch: Dispatch;
  onConfirm: () => void;
  onDispatch: () => void;
  onCancel: () => void;
  onPadaan: () => void;
  onInvoice: () => void;
  onReturn: () => void;
  actionLoading: boolean;
}) {
  const st = STATUS_MAP[d.status];
  const StIcon = st?.icon || Clock;
  const totalQty = d.request.items.reduce(
    (s, i) => s + (i.approvedQuantity || i.quantity),
    0,
  );
  const totalAmt = d.request.items.reduce(
    (s, i) => s + (i.approvedQuantity || i.quantity) * Number(i.product.price),
    0,
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-800">
              {d.dispatchNumber}
            </h2>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${st?.bg} ${st?.color}`}
            >
              <StIcon className="h-3.5 w-3.5" />
              {st?.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Хүсэлт: {d.request.requestNumber} •{" "}
            {new Date(d.createdAt).toLocaleString("mn-MN")}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {d.request.payment && (
            <button
              onClick={onInvoice}
              className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              <FileText className="h-4 w-4" />
              Нэхэмжлэх
            </button>
          )}
          <button
            onClick={onPadaan}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" />
            Падаан
          </button>
        </div>
      </div>

      {/* 4-Level Progress Stepper */}
      {d.status !== "CANCELLED" && (
        <div className="mt-4 flex items-center gap-0 rounded-xl bg-slate-50 p-4">
          {STEPS.map((step, i) => {
            const current = stepIndex(d.status);
            const done = i < current;
            const active = i === current;
            const SIcon = step.icon;
            return (
              <div
                key={step.key}
                className="flex items-center flex-1 last:flex-none"
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${
                      done
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : active
                          ? "border-blue-500 bg-blue-500 text-white ring-4 ring-blue-100"
                          : "border-slate-200 bg-white text-slate-300"
                    }`}
                  >
                    <SIcon className="h-4 w-4" />
                  </div>
                  <span
                    className={`mt-1.5 text-[11px] font-bold text-center leading-tight ${
                      done
                        ? "text-emerald-600"
                        : active
                          ? "text-blue-600"
                          : "text-slate-300"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 flex-1 rounded-full ${
                      done ? "bg-emerald-400" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info Grid */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase text-slate-400">
            Байгууллага
          </p>
          <p className="mt-1 font-medium text-slate-800">
            {d.request.organization.name}
          </p>
          {d.request.requestedBy && (
            <p className="text-sm text-slate-500">
              {d.request.requestedBy.profile?.fullName ||
                d.request.requestedBy.email}
            </p>
          )}
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase text-slate-400">
            Хүргэлтийн хаяг
          </p>
          <p className="mt-1 font-medium text-slate-800">
            {d.request.deliveryAddress || "Тодорхойгүй"}
          </p>
          {d.request.deliveryPhone && (
            <p className="text-sm text-slate-500">{d.request.deliveryPhone}</p>
          )}
        </div>
        {d.driverName && (
          <div className="rounded-lg bg-purple-50 p-3">
            <p className="text-xs font-medium uppercase text-purple-400">
              Жолооч
            </p>
            <p className="mt-1 font-medium text-purple-800">{d.driverName}</p>
            <p className="text-sm text-purple-600">
              {d.driverPhone}
              {d.vehicleNumber && ` • ${d.vehicleNumber}`}
            </p>
          </div>
        )}
        {d.request.payment && (
          <div className="rounded-lg bg-green-50 p-3">
            <p className="text-xs font-medium uppercase text-green-400">
              Төлбөр
            </p>
            <p className="mt-1 font-medium text-green-800">
              {d.request.payment.invoiceNumber}
            </p>
            <p className="text-sm text-green-600">
              ₮{Number(d.request.payment.totalAmount).toLocaleString()} •{" "}
              {d.request.payment.status === "PAID" ? "Төлсөн" : "Төлөөгүй"}
            </p>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="mt-5">
        <h3 className="mb-3 text-sm font-bold uppercase text-slate-400">
          Барааны жагсаалт
        </h3>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">
                  №
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">
                  Бүтээгдэхүүн
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">
                  SKU
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">
                  Тоо
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">
                  Үнэ
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">
                  Нийт
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {d.request.items.map((item, idx) => {
                const qty = item.approvedQuantity || item.quantity;
                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {item.product.name}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {item.product.sku || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-800">
                      {qty}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-600">
                      ₮{Number(item.product.price).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-800">
                      ₮{(qty * Number(item.product.price)).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-slate-200 bg-slate-50">
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-3 text-right font-bold text-slate-700"
                >
                  Нийт:
                </td>
                <td className="px-4 py-3 text-right font-bold text-slate-800">
                  {totalQty}
                </td>
                <td></td>
                <td className="px-4 py-3 text-right font-bold text-blue-600">
                  ₮{totalAmt.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {d.request.note && (
        <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <strong>Тэмдэглэл:</strong> {d.request.note}
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
        {d.status === "PENDING" && (
          <>
            <button
              onClick={onConfirm}
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Баталгаажуулах
            </button>
            <button
              onClick={onCancel}
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-lg border border-red-300 px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Ban className="h-4 w-4" />
              Цуцлах
            </button>
          </>
        )}
        {d.status === "CONFIRMED" && (
          <>
            <button
              onClick={onDispatch}
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Truck className="h-4 w-4" />
              )}
              Жолооч томилох & Илгээх
            </button>
            <button
              onClick={onCancel}
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-lg border border-red-300 px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Ban className="h-4 w-4" />
              Цуцлах
            </button>
          </>
        )}
        {d.status === "DISPATCHED" && (
          <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-800">
            <Truck className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                Хүргэгчийн баталгаажуулалт хүлээгдэж байна
              </p>
              <p className="mt-0.5 text-xs leading-5 text-blue-700">
                Барааг хүлээлгэн өгсний дараа хүргэлтийн ажилтан зурагтай
                баримтаар хүргэлтийг дуусгана.
              </p>
            </div>
          </div>
        )}
        {d.status === "DELIVERED" && (
          <button
            onClick={onReturn}
            className="flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-700"
          >
            <RotateCcw className="h-4 w-4" />
            Буцаалт бүртгэх
          </button>
        )}
      </div>
    </div>
  );
}


