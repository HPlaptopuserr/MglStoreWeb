"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Loader2,
  ChevronDown,
  PackageMinus,
  AlertTriangle,
  Check,
  MapPin,
  ArrowRight,
  Warehouse,
} from "lucide-react";
import { API, wmsFetch } from "@/lib/api";
import { DispatchDestinationSection } from "@/features/dispatch/DispatchDestinationSection";
import type { WarehouseInventorySearchItem } from "@/features/dispatch/WarehouseProductSearch";
import {
  DispatchItemsSection,
  type DispatchLineItem,
} from "@/features/dispatch/DispatchItemsSection";
import type { DispatchDestination } from "@/features/dispatch/types";

type WarehouseOption = { id: string; name: string };

const emptyDestination = (): DispatchDestination => ({
  address: "",
  recipientName: "",
  recipientPhone: "",
  lat: null,
  lng: null,
});

export default function DispatchPage() {
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [items, setItems] = useState<DispatchLineItem[]>([]);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [destination, setDestination] =
    useState<DispatchDestination>(emptyDestination);
  const [submitError, setSubmitError] = useState("");

  // Load warehouses
  useEffect(() => {
    const load = async () => {
      try {
        const res = await wmsFetch(`${API}/warehouses`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.warehouses || [];
          setWarehouses(list);
          if (list.length > 0) setSelectedWarehouseId(list[0].id);
        }
      } catch {
        /* ignore */
      }
    };
    load();
  }, []);

  // Reset the draft when the source warehouse changes.
  useEffect(() => {
    setItems([]);
    setDestination(emptyDestination());
    setSubmitError("");
  }, [selectedWarehouseId]);

  const selectedProductIds = useMemo(
    () => new Set(items.map((item) => item.productId)),
    [items],
  );

  const addItem = (inv: WarehouseInventorySearchItem) => {
    setItems((currentItems) => [
      ...currentItems,
      {
        productId: inv.product.id,
        name: inv.product.name,
        sku: inv.product.sku,
        imageUrl: inv.product.images?.[0]?.url ?? null,
        unitPrice: Number(inv.product.price) || 0,
        available: inv.quantity,
        quantity: 1,
      },
    ]);
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty < 1) return;
    setItems(
      items.map((i) =>
        i.productId === productId ? { ...i, quantity: qty } : i,
      ),
    );
  };

  const removeItem = (productId: string) => {
    setItems(items.filter((i) => i.productId !== productId));
  };

  const hasError = items.some((i) => i.quantity > i.available);
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const hasMissingPrice = items.some((item) => item.unitPrice <= 0);
  const hasDestination =
    destination.address.trim().length > 0 &&
    destination.lat !== null &&
    destination.lng !== null;

  const handleSubmit = async () => {
    if (
      hasError ||
      items.length === 0 ||
      !selectedWarehouseId ||
      !hasDestination
    ) {
      return;
    }
    setShowConfirm(false);
    setSaving(true);
    setSaved(false);
    setSubmitError("");

    try {
      const response = await wmsFetch(
        `${API}/warehouses/${selectedWarehouseId}/manual-dispatches`,
        {
          method: "POST",
          body: JSON.stringify({
            ...destination,
            reason,
            note,
            items: items.map(({ productId, quantity }) => ({
              productId,
              quantity,
            })),
          }),
        },
      );
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        const message =
          payload &&
          typeof payload === "object" &&
          "message" in payload &&
          typeof payload.message === "string"
            ? payload.message
            : "Бараа гаргалт бүртгэхэд алдаа гарлаа";
        throw new Error(message);
      }

      setSaved(true);
      setItems([]);
      setReason("");
      setNote("");
      setDestination(emptyDestination());
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Dispatch failed:", error);
      setSubmitError(
        error instanceof Error ? error.message : "Гаргахад алдаа гарлаа",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">
            Агуулахаас дэлгүүр болон хүргэх цэг рүү бараа илгээх
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Байршил сонгох → бараа нэмэх → шалгаж баталгаажуулах
          </p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
            <Check className="h-4 w-4" />
            Амжилттай гаргагдлаа
          </div>
        )}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {/* Warehouse + Reason */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.03] sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Warehouse className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-bold text-slate-950">
                  Гаргалтын үндсэн мэдээлэл
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Эх үүсвэр агуулах болон гаргах шалтгаанаа сонгоно.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Агуулах
                </label>
                <div className="relative">
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Шалтгаан
                </label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Захиалга, гэмтэл, шилжүүлэг..."
                  className="h-11 w-full rounded-lg border border-slate-300 px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          <DispatchDestinationSection
            warehouseId={selectedWarehouseId}
            value={destination}
            onChange={setDestination}
          />

          <DispatchItemsSection
            warehouseId={selectedWarehouseId}
            items={items}
            excludedProductIds={selectedProductIds}
            onAdd={addItem}
            onQuantityChange={updateQuantity}
            onRemove={removeItem}
          />

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.03]">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Тэмдэглэл
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Нэмэлт тайлбар..."
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="lg:col-span-4">
          <div className="sticky top-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-900/[0.05]">
            <div className="border-b border-slate-100 bg-slate-50/80 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  3
                </span>
                <div>
                  <h3 className="font-bold text-slate-950">
                    Шалгаж баталгаажуулах
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Гаргалтын эцсийн мэдээлэл
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Барааны төрөл</span>
                  <span className="font-semibold text-slate-900">
                    {items.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Нийт тоо ширхэг</span>
                  <span className="font-semibold text-slate-900">
                    {totalQuantity.toLocaleString()}
                  </span>
                </div>
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-end justify-between gap-3">
                    <span className="text-sm font-medium text-slate-600">
                      Нийт төлбөр
                    </span>
                    <span className="text-xl font-extrabold tracking-tight text-blue-700">
                      {totalAmount.toLocaleString("mn-MN")}₮
                    </span>
                  </div>
                  <p className="mt-1 text-right text-[11px] text-slate-400">
                    {totalQuantity.toLocaleString("mn-MN")} ширхэг барааны дүн
                  </p>
                </div>
              </div>

              {hasDestination && (
                <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/70 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                        Хүргэх цэг
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-slate-900">
                        {destination.recipientName || destination.address}
                      </p>
                      {destination.recipientName && (
                        <p className="mt-1 line-clamp-2 text-xs leading-4 text-slate-500">
                          {destination.address}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {hasError && (
                <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                  <AlertTriangle className="mb-0.5 mr-1 inline h-3 w-3" />
                  Нөөцөөс хэтэрсэн бараа байна
                </div>
              )}

              {hasMissingPrice && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium leading-5 text-amber-700">
                  <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5" />
                  Үнэ тохируулаагүй бараа байгаа тул төлбөрийн дүн бүрэн бус
                  байна.
                </div>
              )}

              {!hasDestination && (
                <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                  <MapPin className="mb-0.5 mr-1 inline h-3 w-3" />
                  Хүргэх хаяг бичиж, газрын зураг дээр цэг сонгоно уу
                </div>
              )}

              {submitError && (
                <div
                  role="alert"
                  className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
                >
                  <AlertTriangle className="mb-0.5 mr-1 inline h-3 w-3" />
                  {submitError}
                </div>
              )}

              <button
                onClick={() => setShowConfirm(true)}
                disabled={
                  saving ||
                  items.length === 0 ||
                  hasError ||
                  !hasDestination ||
                  hasMissingPrice
                }
                className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl disabled:translate-y-0 disabled:cursor-not-allowed disabled:shadow-none disabled:opacity-45"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <PackageMinus className="h-4 w-4" />
                    Бараа гаргах
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
              <p className="mt-3 text-center text-[11px] leading-4 text-slate-400">
                Баталгаажуулсны дараа агуулахын үлдэгдэл автоматаар хасагдана.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              Гаргалтыг баталгаажуулах
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {items.length} төрлийн {totalQuantity} ширхэг бараа агуулахаас
              гаргаж, <strong>{destination.address}</strong> хаяг руу илгээх гэж
              байна. Нийт төлбөр{" "}
              <strong>{totalAmount.toLocaleString("mn-MN")}₮</strong>.
              Үргэлжлүүлэх үү?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Цуцлах
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Баталгаажуулах
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
