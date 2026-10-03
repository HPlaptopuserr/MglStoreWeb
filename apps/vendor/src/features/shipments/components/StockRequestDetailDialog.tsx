"use client";

import { STOCK_REQUEST_STATUS } from "@/features/shipments/stock-request.constants";
import type { StockRequest } from "@/features/shipments/types/stock-request.types";
import {
  isShipmentImageUrl,
  resolveShipmentAssetUrl,
} from "@/features/shipments/utils/shipment-assets";
import {
  CheckCircle,
  Clock,
  ExternalLink,
  FileImage,
  Loader2,
  MapPin,
  Package,
  Phone,
  Receipt,
  Trash2,
  Upload,
  Warehouse as WarehouseIcon,
  X,
} from "lucide-react";
import type * as React from "react";

interface StockRequestDetailDialogProps {
  showDetailModal: boolean;
  selectedRequest: StockRequest | null;
  setShowDetailModal: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedRequest: React.Dispatch<React.SetStateAction<StockRequest | null>>;
  documentFileInputRef: React.RefObject<HTMLInputElement | null>;
  uploadDeliveryDocument: (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => Promise<void>;
  removeDeliveryDocument: () => Promise<void>;
  savingDeliveryDocument: boolean;
}

export function StockRequestDetailDialog({
  showDetailModal,
  selectedRequest,
  setShowDetailModal,
  setSelectedRequest,
  documentFileInputRef,
  uploadDeliveryDocument,
  removeDeliveryDocument,
  savingDeliveryDocument,
}: StockRequestDetailDialogProps) {
  return (
    showDetailModal &&
    selectedRequest && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-xl max-h-[90vh] overflow-auto rounded-2xl bg-white shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {selectedRequest.requestNumber}
              </h2>
              <p className="text-sm text-slate-500">
                {new Date(selectedRequest.requestedAt).toLocaleString("mn-MN")}
              </p>
            </div>
            <button
              onClick={() => {
                setShowDetailModal(false);
                setSelectedRequest(null);
              }}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-6 space-y-6">
            {(() => {
              const config = STOCK_REQUEST_STATUS[selectedRequest.status];
              const StatusIcon = config.icon;
              return (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${config.bgColor} ${config.color}`}
                >
                  <StatusIcon className="h-4 w-4" />
                  {config.label}
                </span>
              );
            })()}

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <WarehouseIcon className="h-5 w-5 text-slate-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800">
                    {selectedRequest.warehouse.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {selectedRequest.warehouse.address},{" "}
                    {selectedRequest.warehouse.city}
                  </p>
                </div>
              </div>
            </div>

            {(selectedRequest.deliveryAddress ||
              selectedRequest.deliveryPhone) && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">Хүргэлт</p>
                {selectedRequest.deliveryAddress && (
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>{selectedRequest.deliveryAddress}</span>
                  </div>
                )}
                {selectedRequest.deliveryPhone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>{selectedRequest.deliveryPhone}</span>
                  </div>
                )}
              </div>
            )}

            <div>
              <p className="mb-3 text-sm font-semibold text-slate-700">
                Бараа ({selectedRequest.items.length})
              </p>
              <div className="space-y-2">
                {selectedRequest.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
                  >
                    <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Package className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-slate-800">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.product.sku || "-"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-800">
                        {item.approvedQuantity || item.quantity} ш
                      </p>
                      {item.approvedQuantity &&
                        item.approvedQuantity !== item.quantity && (
                          <p className="text-xs text-slate-500 line-through">
                            {item.quantity} ш
                          </p>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedRequest.note && (
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Тэмдэглэл
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedRequest.note}
                </p>
              </div>
            )}

            {/* StockRequestPayment Info */}
            {selectedRequest.payment && (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Receipt className="h-5 w-5 text-slate-600" />
                  <p className="font-semibold text-slate-800">Нэхэмжлэх</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">Нэхэмжлэх №</p>
                    <p className="font-medium">
                      {selectedRequest.payment.invoiceNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Дүн</p>
                    <p className="font-bold text-lg text-slate-900">
                      {Number(
                        selectedRequest.payment.totalAmount,
                      ).toLocaleString()}
                      ₮
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Төлөв</p>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        selectedRequest.payment.status === "PAID"
                          ? "bg-green-100 text-green-700"
                          : selectedRequest.payment.status === "PENDING"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {selectedRequest.payment.status === "PAID" && (
                        <CheckCircle className="h-3 w-3" />
                      )}
                      {selectedRequest.payment.status === "PENDING" && (
                        <Clock className="h-3 w-3" />
                      )}
                      {selectedRequest.payment.status === "PAID"
                        ? "Төлөгдсөн"
                        : selectedRequest.payment.status === "PENDING"
                          ? "Төлөгдөөгүй"
                          : "Цуцлагдсан"}
                    </span>
                  </div>
                  {selectedRequest.payment.dueDate && (
                    <div>
                      <p className="text-slate-500">Төлөх хугацаа</p>
                      <p
                        className={`font-medium ${
                          new Date(selectedRequest.payment.dueDate) <
                            new Date() &&
                          selectedRequest.payment.status === "PENDING"
                            ? "text-red-600"
                            : ""
                        }`}
                      >
                        {new Date(
                          selectedRequest.payment.dueDate,
                        ).toLocaleDateString("mn-MN")}
                      </p>
                    </div>
                  )}
                </div>
                {selectedRequest.payment.status === "PENDING" && (
                  <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                    <p className="text-xs text-amber-700">
                      Төлбөр төлөгдөөгүй байгаа тул шинэ захиалга батлагдахгүй
                      болно
                    </p>
                  </div>
                )}
              </div>
            )}

            {(selectedRequest.status === "COMPLETED" ||
              selectedRequest.dispatch?.status === "DELIVERED") && (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-slate-600" />
                    <p className="font-semibold text-slate-800">Ирсэн падаан</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {(() => {
                    const rawPadaanUrl =
                      selectedRequest.dispatch?.padaanUrl || "";
                    const padaanUrl = resolveShipmentAssetUrl(rawPadaanUrl);
                    const canPreviewImage =
                      isShipmentImageUrl(rawPadaanUrl) ||
                      isShipmentImageUrl(padaanUrl);

                    return (
                      <>
                        <input
                          ref={documentFileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          onChange={uploadDeliveryDocument}
                        />

                        {padaanUrl ? (
                          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                            {canPreviewImage ? (
                              <img
                                src={padaanUrl}
                                alt="Ирсэн падаан"
                                className="max-h-72 w-full bg-white object-contain"
                              />
                            ) : (
                              <div className="flex h-32 flex-col items-center justify-center gap-2 text-slate-500">
                                <FileImage className="h-8 w-8" />
                                <span className="text-sm font-semibold">
                                  Падаан хадгалагдсан
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-500">
                            <FileImage className="h-8 w-8" />
                            <span className="text-sm font-semibold">
                              Падааны зураг оруулаагүй байна
                            </span>
                          </div>
                        )}

                        <div className="flex flex-wrap justify-end gap-2">
                          {padaanUrl && (
                            <a
                              href={padaanUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Нээх
                            </a>
                          )}
                          {padaanUrl && (
                            <button
                              type="button"
                              onClick={removeDeliveryDocument}
                              disabled={savingDeliveryDocument}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-100 px-4 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Trash2 className="h-4 w-4" />
                              Устгах
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              documentFileInputRef.current?.click()
                            }
                            disabled={
                              savingDeliveryDocument ||
                              !selectedRequest.dispatch
                            }
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {savingDeliveryDocument ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                            {savingDeliveryDocument
                              ? "Upload хийж байна..."
                              : "Зураг upload"}
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {selectedRequest.reviewNote && (
              <div
                className={`rounded-xl p-4 ${selectedRequest.status === "REJECTED" ? "bg-red-50" : "bg-blue-50"}`}
              >
                <p
                  className={`text-sm font-semibold ${selectedRequest.status === "REJECTED" ? "text-red-800" : "text-blue-800"}`}
                >
                  Админы тэмдэглэл
                </p>
                <p
                  className={`mt-1 text-sm ${selectedRequest.status === "REJECTED" ? "text-red-600" : "text-blue-600"}`}
                >
                  {selectedRequest.reviewNote}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  );
}
