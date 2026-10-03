"use client";

import type { StockRequestPayment } from "@/features/shipments/types/stock-request.types";
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Clock,
  Loader2,
  Receipt,
} from "lucide-react";
import type * as React from "react";

interface StockPaymentHistoryProps {
  paymentHistory: StockRequestPayment[];
  navigation: React.ReactNode;
  loadingPayments: boolean;
  openPaymentDetail: (paymentId: string) => Promise<void>;
  paymentDialog: React.ReactNode;
}

export function StockPaymentHistory({
  paymentHistory,
  navigation,
  loadingPayments,
  openPaymentDetail,
  paymentDialog,
}: StockPaymentHistoryProps) {
  const unpaidCount = paymentHistory.filter(
    (p) => p.status === "PENDING" || p.status === "FAILED",
  ).length;
  const paidCount = paymentHistory.filter((p) => p.status === "PAID").length;
  const totalUnpaid = paymentHistory
    .filter((p) => p.status === "PENDING" || p.status === "FAILED")
    .reduce(
      (sum, p) => sum + (Number(p.totalAmount) - Number(p.paidAmount)),
      0,
    );
  return (
    <div className="space-y-4 p-2">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Төлбөрийн түүх
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Бараа таталтын захиалгын нэхэмжлэх, төлбөрийн мэдээлэл
          </p>
        </div>
      </div>

      {navigation}

      {/* Stats */}
      <div className="grid overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-3 sm:divide-x sm:divide-slate-200">
        <div className="border-b border-slate-100 px-4 py-3 sm:border-b-0">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-100 p-2">
              <Clock className="h-4 w-4 text-slate-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{unpaidCount}</p>
              <p className="text-xs text-slate-500">Хүлээгдэж буй</p>
            </div>
          </div>
        </div>
        <div className="border-b border-slate-100 px-4 py-3 sm:border-b-0">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-100 p-2">
              <CheckCircle className="h-4 w-4 text-slate-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{paidCount}</p>
              <p className="text-xs text-slate-500">Амжилттай төлөгдсөн</p>
            </div>
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-900 p-2">
              <Receipt className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">
                {totalUnpaid.toLocaleString()}₮
              </p>
              <p className="text-xs text-slate-500">Төлөгдөөгүй нийт дүн</p>
            </div>
          </div>
        </div>
      </div>

      {unpaidCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Төлбөр хүлээгдэж байна
            </p>
            <p className="mt-0.5 text-xs leading-5 text-slate-600">
              Шинэ захиалга үүсгэхийн өмнө хугацаа хэтрээгүй нэхэмжлэхүүдийг
              төлж барагдуулна уу.
            </p>
          </div>
        </div>
      )}

      {loadingPayments ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#FFAD02]" />
        </div>
      ) : paymentHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16">
          <div className="mb-4 rounded-full bg-slate-100 p-4">
            <Receipt className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-lg font-semibold text-slate-600">
            Төлбөрийн түүх байхгүй
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Бараа таталтын захиалга илгээсний дараа энд харагдана
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="hidden grid-cols-[minmax(0,1.25fr)_minmax(150px,0.8fr)_150px_180px_32px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:grid">
            <span>Нэхэмжлэх</span>
            <span>Захиалга</span>
            <span>Төлөв</span>
            <span className="text-right">Дүн / хугацаа</span>
            <span />
          </div>
          <div className="divide-y divide-slate-100">
            {paymentHistory.map((payment) => (
              <button
                key={payment.id}
                type="button"
                onClick={() => openPaymentDetail(payment.id)}
                className="grid w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 md:grid-cols-[minmax(0,1.25fr)_minmax(150px,0.8fr)_150px_180px_32px] md:items-center md:gap-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {payment.invoiceNumber}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {new Date(payment.createdAt).toLocaleDateString("mn-MN")}
                  </p>
                </div>
                <div className="flex justify-between md:block">
                  <span className="text-xs text-slate-500 md:hidden">
                    Захиалга
                  </span>
                  <span className="text-sm font-medium text-slate-700">
                    {payment.request?.requestNumber || "—"}
                  </span>
                </div>
                <div className="flex justify-between md:block">
                  <span className="text-xs text-slate-500 md:hidden">
                    Төлөв
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${
                      payment.status === "PAID"
                        ? "bg-emerald-50 text-emerald-700"
                        : payment.status === "PENDING"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        payment.status === "PAID"
                          ? "bg-emerald-500"
                          : payment.status === "PENDING"
                            ? "bg-amber-500"
                            : "bg-rose-500"
                      }`}
                    />
                    {payment.status === "PAID"
                      ? "Төлөгдсөн"
                      : payment.status === "PENDING"
                        ? "Төлөгдөөгүй"
                        : "Алдаатай"}
                  </span>
                </div>
                <div className="flex items-end justify-between md:block md:text-right">
                  <span className="text-xs text-slate-500 md:hidden">Дүн</span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {Number(payment.totalAmount).toLocaleString()}₮
                    </p>
                    {payment.dueDate && payment.status === "PENDING" && (
                      <p
                        className={`mt-0.5 text-xs ${
                          new Date(payment.dueDate) < new Date()
                            ? "font-medium text-rose-600"
                            : "text-slate-500"
                        }`}
                      >
                        Хугацаа:{" "}
                        {new Date(payment.dueDate).toLocaleDateString("mn-MN")}
                      </p>
                    )}
                    {payment.paidAt && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        Төлсөн:{" "}
                        {new Date(payment.paidAt).toLocaleDateString("mn-MN")}
                      </p>
                    )}
                  </div>
                </div>
                <ChevronRight className="hidden h-4 w-4 text-slate-300 md:block" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* StockRequestPayment Detail Modal */}
      {paymentDialog}
    </div>
  );
}
