"use client";

import type {
  StockRequestCartItem,
  StockRequestUser,
  StockRequestView,
  SupplyWarehouse,
} from "@/features/shipments/types/stock-request.types";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  MapPin,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Trash2,
  Warehouse,
} from "lucide-react";
import type * as React from "react";
import { StockRequestQuantityInput } from "./StockRequestQuantityInput";
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
  storageError?: string;
}

const money = (amount: number) => `${amount.toLocaleString("mn-MN")} ₮`;
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2";

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
  storageError,
}: StockRequestCheckoutProps) {
  const hasAddress = Boolean(deliveryAddress.trim());
  return (
    <div className="mx-auto max-w-[1440px] space-y-5 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setViewMode("browse")}
            aria-label="Барааны жагсаалт руу буцах"
            className={`flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950 ${focusRing}`}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </button>
          <div>
            <p className="text-xs font-medium text-slate-500">
              Бараа таталт / Сагс
            </p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
              Захиалгаа шалгах
            </h1>
          </div>
        </div>
        <p className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
          <Warehouse className="size-3.5 text-amber-600" aria-hidden="true" />
          {selectedWarehouse?.name || "Нийлүүлэгч агуулах"}
        </p>
      </header>

      {storageError && (
        <p
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
        >
          {storageError}
        </p>
      )}
      {cart.length === 0 ? (
        <section className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
            <ShoppingCart className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-slate-900">
            Сагс хоосон байна
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
            Агуулахын каталогоос хэрэгтэй бараагаа сонгож захиалгаа бэлтгээрэй.
          </p>
          <button
            type="button"
            onClick={() => setViewMode("browse")}
            className={`mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 ${focusRing}`}
          >
            Бараа сонгох <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </section>
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-5">
            <section
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              aria-labelledby="order-items-title"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
                <div className="flex items-center gap-2.5">
                  <h2
                    id="order-items-title"
                    className="text-sm font-bold text-slate-950"
                  >
                    Захиалгын бараа
                  </h2>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    {cart.length} нэр төрөл
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setViewMode("browse")}
                  className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 ${focusRing}`}
                >
                  <Plus className="size-3.5" aria-hidden="true" /> Бараа нэмэх
                </button>
              </div>
              <div className="hidden grid-cols-[minmax(0,1fr)_128px_108px_36px] items-center gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-2.5 text-[11px] font-semibold text-slate-500 md:grid">
                <span>БАРААНЫ МЭДЭЭЛЭЛ</span>
                <span className="text-center">ТОО ХЭМЖЭЭ</span>
                <span className="text-right">НИЙТ ДҮН</span>
                <span className="sr-only">Устгах</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {cart.map((item) => (
                  <li
                    key={item.productId}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 sm:px-5 md:grid-cols-[minmax(0,1fr)_128px_108px_36px] md:gap-4"
                  >
                    <div className="col-span-2 flex min-w-0 items-center gap-3 pr-8 md:col-span-1 md:pr-0">
                      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-1.5">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt=""
                            loading="lazy"
                            className="size-full object-contain"
                          />
                        ) : (
                          <Package
                            className="size-5 text-slate-300"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="break-words text-sm font-semibold leading-5 text-slate-900">
                          {item.name}
                        </h3>
                        <p className="mt-1 break-all text-[11px] text-slate-400">
                          SKU: {item.sku || "—"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {money(Number(item.price))} / ш
                        </p>
                      </div>
                    </div>
                    <div className="col-start-1 row-start-2 flex items-center gap-3 md:col-auto md:row-auto md:block">
                      <div className="inline-flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <button
                          type="button"
                          aria-label={`${item.name}-ийн тоог хасах`}
                          onClick={() =>
                            updateCartQuantity(
                              item.productId,
                              item.quantity - 1,
                            )
                          }
                          disabled={isSubmitting}
                          className={`flex size-10 items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 ${focusRing}`}
                        >
                          <Minus className="size-3.5" aria-hidden="true" />
                        </button>
                        <StockRequestQuantityInput
                          key={item.quantity}
                          name={item.name}
                          quantity={item.quantity}
                          available={item.available}
                          disabled={isSubmitting}
                          onCommit={(quantity) =>
                            updateCartQuantity(item.productId, quantity)
                          }
                        />
                        <button
                          type="button"
                          aria-label={`${item.name}-ийн тоог нэмэх`}
                          onClick={() =>
                            updateCartQuantity(
                              item.productId,
                              item.quantity + 1,
                            )
                          }
                          disabled={
                            isSubmitting || item.quantity >= item.available
                          }
                          className={`flex size-10 items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                        >
                          <Plus className="size-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <div className="col-start-2 row-start-2 text-right text-sm font-bold tabular-nums text-slate-900 md:col-auto md:row-auto">
                      <span className="sr-only">Нийт дүн</span>
                      {money(Number(item.price) * item.quantity)}
                    </div>
                    <button
                      type="button"
                      aria-label={`${item.name}-ийг сагснаас хасах`}
                      onClick={() => updateCartQuantity(item.productId, 0)}
                      disabled={isSubmitting}
                      className={`col-start-2 row-start-1 self-start justify-self-end rounded-lg p-2.5 md:col-auto md:row-auto md:self-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 ${focusRing}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {user?.organizationId && (
              <DeliveryLocationSelector
                organizationId={user.organizationId}
                address={deliveryAddress}
                phone={deliveryPhone}
                onAddressChange={setDeliveryAddress}
                onPhoneChange={setDeliveryPhone}
              />
            )}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <label className="block text-sm font-semibold text-slate-800">
                Захиалгын тэмдэглэл{" "}
                <span className="ml-1 text-xs font-normal text-slate-400">
                  Сонголттой
                </span>
                <textarea
                  value={note}
                  disabled={isSubmitting}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Хүлээн авах цаг, хүргэлтийн нэмэлт мэдээлэл…"
                  rows={2}
                  className="mt-3 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                />
              </label>
            </section>
          </div>

          <aside
            aria-labelledby="checkout-summary-title"
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white xl:sticky xl:top-5"
          >
            <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
              <h2
                id="checkout-summary-title"
                className="text-sm font-bold text-slate-950"
              >
                Захиалгын хураангуй
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Илгээхээс өмнө мэдээллээ шалгана уу.
              </p>
            </div>
            <div className="space-y-5 p-5">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Барааны төрөл</dt>
                  <dd className="font-semibold text-slate-800">
                    {cart.length}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Нийт тоо хэмжээ</dt>
                  <dd className="font-semibold text-slate-800">
                    {totalCartItems.toLocaleString("mn-MN")} ш
                  </dd>
                </div>
                <div className="flex flex-wrap items-end justify-between gap-2 border-t border-dashed border-slate-200 pt-4">
                  <dt className="text-sm font-medium text-slate-600">
                    Тооцоолсон дүн
                  </dt>
                  <dd className="text-2xl font-bold tracking-tight text-slate-950">
                    {money(totalCartAmount)}
                  </dd>
                </div>
              </dl>
              <div
                className={`rounded-xl border p-3 text-xs leading-5 ${hasAddress ? "border-emerald-100 bg-emerald-50/60 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}
              >
                <p className="flex items-center gap-1.5 font-semibold">
                  {hasAddress ? (
                    <CheckCircle2
                      className="size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                  ) : (
                    <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                  )}
                  {hasAddress
                    ? "Хүргэлтийн хаяг сонгосон"
                    : "Хүргэлтийн хаягаа сонгоно уу"}
                </p>
                {hasAddress && (
                  <p className="mt-1.5 break-words text-emerald-900">
                    {deliveryAddress}
                    {deliveryPhone && (
                      <span className="mt-1 block font-medium">
                        {deliveryPhone}
                      </span>
                    )}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={isSubmitting || !hasAddress}
                className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FFAD02] px-4 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2
                      className="size-4 animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />{" "}
                    Илгээж байна…
                  </>
                ) : (
                  <>
                    Захиалга баталгаажуулах{" "}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </>
                )}
              </button>
              {!storageError && (
                <p className="text-xs leading-5 text-slate-500">
                  Сагс энэ төхөөрөмж дээр хадгалагдана.
                </p>
              )}
              <p className="text-xs leading-5 text-slate-500">
                Хүсэлт илгээгдсэний дараа агуулах хянаж баталгаажуулна. Үнэ,
                боломжит үлдэгдлийг илгээх үед дахин шалгана.
              </p>
            </div>
          </aside>
        </div>
      )}
      {confirmationDialog}
      {successDialog}
    </div>
  );
}
