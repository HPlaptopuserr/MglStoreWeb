"use client";

import { IS_LOCAL_DEVELOPMENT } from "@/features/shipments/stock-request.constants";
import type { StockRequestPayment } from "@/features/shipments/types/stock-request.types";
import { CheckCircle, Clock, Loader2, Printer, X } from "lucide-react";
import type * as React from "react";
import { StockPaymentQrSection } from "./StockPaymentQrSection";

interface StockPaymentDetailDialogProps {
  showPaymentModal: boolean;
  loadingPaymentDetail: boolean;
  selectedPayment: StockRequestPayment | null;
  handlePrintInvoice: () => void;
  setShowPaymentModal: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedPayment: React.Dispatch<
    React.SetStateAction<StockRequestPayment | null>
  >;
  openPaymentDetail: (paymentId: string) => Promise<void>;
  refreshPayments: () => Promise<void>;
  refreshStockRequests: () => Promise<void>;
  markPaymentPaidLocally: () => Promise<void>;
  markingPaymentPaid: boolean;
}

export function StockPaymentDetailDialog({
  showPaymentModal,
  loadingPaymentDetail,
  selectedPayment,
  handlePrintInvoice,
  setShowPaymentModal,
  setSelectedPayment,
  openPaymentDetail,
  refreshPayments,
  refreshStockRequests,
  markPaymentPaidLocally,
  markingPaymentPaid,
}: StockPaymentDetailDialogProps) {
  return (
    showPaymentModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:bg-white print:p-0">
        <div className="w-full max-w-2xl max-h-[90vh] overflow-auto rounded-2xl bg-white shadow-2xl print:shadow-none print:max-w-none print:max-h-none print:rounded-none">
          {loadingPaymentDetail ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#FFAD02]" />
            </div>
          ) : selectedPayment ? (
            <>
              {/* Header - hide on print */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4 print:hidden">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Нэхэмжлэх
                  </h2>
                  <p className="text-sm text-slate-500">
                    {selectedPayment.invoiceNumber}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintInvoice}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Printer className="h-4 w-4" />
                    Хэвлэх
                  </button>
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      setSelectedPayment(null);
                    }}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Print Content */}
              <div className="p-6 print:p-0">
                {/* Invoice Header */}
                <div className="border-b border-slate-200 pb-6 print:pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900 print:text-xl">
                        НЭХЭМЖЛЭХ
                      </h1>
                      <p className="text-lg font-semibold text-[#FFAD02] mt-1">
                        {selectedPayment.invoiceNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium print:border ${
                          selectedPayment.status === "PAID"
                            ? "bg-green-100 text-green-700 print:border-green-500"
                            : selectedPayment.status === "PENDING"
                              ? "bg-amber-100 text-amber-700 print:border-amber-500"
                              : "bg-red-100 text-red-700 print:border-red-500"
                        }`}
                      >
                        {selectedPayment.status === "PAID" && (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        {selectedPayment.status === "PENDING" && (
                          <Clock className="h-4 w-4" />
                        )}
                        {selectedPayment.status === "PAID"
                          ? "ТӨЛӨГДСӨН"
                          : selectedPayment.status === "PENDING"
                            ? "ТӨЛӨГДӨӨГҮЙ"
                            : "ЦУЦЛАГДСАН"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                    <div>
                      <p className="text-slate-500">Огноо</p>
                      <p className="font-medium">
                        {new Date(selectedPayment.createdAt).toLocaleDateString(
                          "mn-MN",
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Захиалгын дугаар</p>
                      <p className="font-medium">
                        {selectedPayment.request?.requestNumber || "-"}
                      </p>
                    </div>
                    {selectedPayment.request?.warehouse && (
                      <div>
                        <p className="text-slate-500">Агуулах</p>
                        <p className="font-medium">
                          {selectedPayment.request.warehouse.name}
                        </p>
                      </div>
                    )}
                    {selectedPayment.dueDate && (
                      <div>
                        <p className="text-slate-500">Төлөх хугацаа</p>
                        <p
                          className={`font-medium ${
                            new Date(selectedPayment.dueDate) < new Date() &&
                            selectedPayment.status === "PENDING"
                              ? "text-red-600"
                              : ""
                          }`}
                        >
                          {new Date(selectedPayment.dueDate).toLocaleDateString(
                            "mn-MN",
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <div className="py-6 print:py-4">
                  <h3 className="font-semibold text-slate-800 mb-4">Бараа</h3>
                  <div className="border rounded-xl overflow-hidden print:border-slate-300">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 print:bg-slate-100">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">
                            №
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">
                            Бараа
                          </th>
                          <th className="text-center px-4 py-3 font-semibold text-slate-600">
                            Тоо
                          </th>
                          <th className="text-right px-4 py-3 font-semibold text-slate-600">
                            Үнэ
                          </th>
                          <th className="text-right px-4 py-3 font-semibold text-slate-600">
                            Нийт
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedPayment.request?.items?.map((item, idx) => {
                          const qty = item.approvedQuantity || item.quantity;
                          const price = Number(item.product.price);
                          const total = qty * price;
                          return (
                            <tr key={item.id}>
                              <td className="px-4 py-3 text-slate-600">
                                {idx + 1}
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-medium text-slate-800">
                                  {item.product.name}
                                </p>
                                {item.product.sku && (
                                  <p className="text-xs text-slate-500">
                                    {item.product.sku}
                                  </p>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center text-slate-600">
                                {qty}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-600">
                                {price.toLocaleString()}₮
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-slate-800">
                                {total.toLocaleString()}₮
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Total */}
                <div className="border-t border-slate-200 pt-4">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Нийт дүн:</span>
                        <span className="font-bold text-lg text-slate-900">
                          {Number(selectedPayment.totalAmount).toLocaleString()}
                          ₮
                        </span>
                      </div>
                      {selectedPayment.status === "PAID" &&
                        selectedPayment.paidAt && (
                          <div className="flex justify-between text-sm text-green-600">
                            <span>Төлсөн огноо:</span>
                            <span className="font-medium">
                              {new Date(
                                selectedPayment.paidAt,
                              ).toLocaleDateString("mn-MN")}
                            </span>
                          </div>
                        )}
                    </div>
                  </div>
                </div>

                {selectedPayment.status !== "PAID" &&
                  selectedPayment.status !== "CANCELLED" && (
                    <StockPaymentQrSection
                      paymentId={selectedPayment.id}
                      onPaid={async () => {
                        await Promise.all([
                          openPaymentDetail(selectedPayment.id),
                          refreshPayments(),
                          refreshStockRequests(),
                        ]);
                      }}
                    />
                  )}

                {IS_LOCAL_DEVELOPMENT &&
                  selectedPayment.status !== "PAID" &&
                  selectedPayment.status !== "CANCELLED" && (
                    <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 print:hidden">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-bold text-emerald-900">
                            Local development төлбөр
                          </p>
                          <p className="mt-1 text-xs text-emerald-700">
                            Бодит төлбөрийн систем дуудахгүйгээр энэ
                            нэхэмжлэхийг бүтэн төлөгдсөн болгоно.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={markPaymentPaidLocally}
                          disabled={markingPaymentPaid}
                          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
                        >
                          {markingPaymentPaid ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          Төлсөн гэж тэмдэглэх
                        </button>
                      </div>
                    </div>
                  )}

                {/* Footer for print */}
                <div className="hidden print:block mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
                  <p>MGL Store - Нэхэмжлэх</p>
                  <p>Хэвлэсэн: {new Date().toLocaleString("mn-MN")}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-slate-500">
              Нэхэмжлэх олдсонгүй
            </div>
          )}
        </div>
      </div>
    )
  );
}
