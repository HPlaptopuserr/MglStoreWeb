"use client";
import type { StockRequestUser } from "@/features/shipments/types/stock-request.types";

import type {
  StockRequestCartItem,
  StockRequestView,
  SupplyWarehouse,
} from "@/features/shipments/types/stock-request.types";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Minus,
  Package,
  Plus,
  ShoppingCart,
} from "lucide-react";
import type * as React from "react";
import { DeliveryLocationSelector } from "./DeliveryLocationSelector";

interface StockRequestCheckoutProps {
  setViewMode: React.Dispatch<React.SetStateAction<StockRequestView>>;
  selectedWarehouse: SupplyWarehouse | null;
  totalCartItems: number;
  cart: StockRequestCartItem[];
  updateCartQuantity: (productId: string, quantity: number) => void;
  totalCartAmount: number;
  user: StockRequestUser | null;
  deliveryAddress: string;
  deliveryPhone: string;
  setDeliveryAddress: React.Dispatch<React.SetStateAction<string>>;
  setDeliveryPhone: React.Dispatch<React.SetStateAction<string>>;
  note: string;
  setNote: React.Dispatch<React.SetStateAction<string>>;
  setShowConfirmModal: React.Dispatch<React.SetStateAction<boolean>>;
  isSubmitting: boolean;
  confirmationDialog: React.ReactNode;
  successDialog: React.ReactNode;
}

export function StockRequestCheckout({
  setViewMode,
  selectedWarehouse,
  totalCartItems,
  cart,
  updateCartQuantity,
  totalCartAmount,
  user,
  deliveryAddress,
  deliveryPhone,
  setDeliveryAddress,
  setDeliveryPhone,
  note,
  setNote,
  setShowConfirmModal,
  isSubmitting,
  confirmationDialog,
  successDialog,
}: StockRequestCheckoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <button
            onClick={() => setViewMode("browse")}
            aria-label="Барааны жагсаалт руу буцах"
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-slate-900">
              Бараа таталтын захиалга
            </h1>
            <p className="truncate text-xs text-slate-500">
              Нийлүүлэгч агуулах: {selectedWarehouse?.name}
            </p>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-xs text-slate-500">Нийт тоо хэмжээ</p>
            <p className="text-sm font-bold text-slate-900">
              {totalCartItems.toLocaleString()} ширхэг
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl p-4">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16">
            <div className="mb-4 rounded-full bg-slate-100 p-4">
              <ShoppingCart className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-lg font-semibold text-slate-600">
              Сагс хоосон байна
            </p>
            <button
              onClick={() => setViewMode("browse")}
              className="mt-4 rounded-xl bg-[#FFAD02] px-6 py-2.5 text-sm font-bold text-white"
            >
              Бараа сонгох
            </button>
          </div>
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.8fr)]">
            <section
              className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              aria-labelledby="order-items-title"
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                  <h2
                    id="order-items-title"
                    className="text-sm font-bold text-slate-900"
                  >
                    Захиалгын бараа
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {cart.length} нэр төрөл
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewMode("browse")}
                  className="text-xs font-semibold text-[#B86E00] hover:text-[#8F5600]"
                >
                  + Бараа нэмэх
                </button>
              </div>

              <div className="hidden grid-cols-[minmax(0,1fr)_120px_128px_120px] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:grid">
                <span>Барааны мэдээлэл</span>
                <span className="text-right">Нэгж үнэ</span>
                <span className="text-center">Тоо хэмжээ</span>
                <span className="text-right">Дүн</span>
              </div>

              <div className="divide-y divide-slate-100">
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_120px_128px_120px] md:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-5 w-5 text-slate-300" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-slate-800">
                          {item.name}
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-400">
                          SKU: {item.sku || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="hidden text-right text-sm text-slate-600 md:block">
                      {Number(item.price).toLocaleString()}₮
                    </div>
                    <div className="flex items-center justify-between md:justify-center">
                      <span className="text-xs text-slate-500 md:hidden">
                        Тоо хэмжээ
                      </span>
                      <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
                        <button
                          type="button"
                          aria-label={`${item.name}-ийн тоог хасах`}
                          onClick={() =>
                            updateCartQuantity(
                              item.productId,
                              item.quantity - 1,
                            )
                          }
                          className="p-1.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-9 border-x border-slate-200 py-1 text-center text-sm font-semibold text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`${item.name}-ийн тоог нэмэх`}
                          onClick={() => {
                            if (item.quantity < item.available) {
                              updateCartQuantity(
                                item.productId,
                                item.quantity + 1,
                              );
                            }
                          }}
                          disabled={item.quantity >= item.available}
                          className="p-1.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm font-semibold text-slate-900 md:block md:text-right">
                      <span className="text-xs font-normal text-slate-500 md:hidden">
                        Дүн
                      </span>
                      <span>
                        {(Number(item.price) * item.quantity).toLocaleString()}₮
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm sm:grid-cols-2">
                <div className="flex justify-between sm:justify-start sm:gap-3">
                  <span className="text-slate-500">Нийт тоо:</span>
                  <span className="font-semibold text-slate-800">
                    {totalCartItems.toLocaleString()} ширхэг
                  </span>
                </div>
                <div className="flex justify-between sm:justify-end sm:gap-3">
                  <span className="text-slate-500">Тооцоолсон дүн:</span>
                  <span className="font-bold text-slate-900">
                    {totalCartAmount.toLocaleString()}₮
                  </span>
                </div>
              </div>
            </section>

            <aside className="space-y-4 lg:sticky lg:top-20">
              {user?.organizationId && (
                <DeliveryLocationSelector
                  organizationId={user.organizationId}
                  address={deliveryAddress}
                  phone={deliveryPhone}
                  onAddressChange={setDeliveryAddress}
                  onPhoneChange={setDeliveryPhone}
                />
              )}

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                  Захиалгын тэмдэглэл
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Шаардлагатай нэмэлт мэдээлэл..."
                  rows={2}
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm transition-colors focus:border-[#FFAD02] focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Submit Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-2.5 shadow-[0_-4px_18px_rgba(15,23,42,0.06)] backdrop-blur md:left-64">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="hidden sm:block">
              <p className="text-xs text-slate-500">Тооцоолсон нийт дүн</p>
              <p className="text-base font-bold text-slate-900">
                {totalCartAmount.toLocaleString()}₮
              </p>
            </div>
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FFAD02] px-8 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#E69B00] disabled:opacity-50 sm:w-auto"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>Захиалга баталгаажуулах</span>
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmationDialog}

      {successDialog}
    </div>
  );
}
