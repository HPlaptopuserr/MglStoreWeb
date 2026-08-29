"use client";

import { useEffect, useState } from "react";
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
  Pencil,
  Save,
  History,
  X,
  Plus,
  Trash2,
} from "lucide-react";
import { API, wmsFetch } from "@/lib/api";
import {
  DispatchProductPicker,
  type DispatchEditableProduct,
} from "./DispatchProductPicker";
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

type ItemEditLog = {
  id: string;
  createdAt: string;
  user?: {
    email?: string;
    profile?: { fullName?: string | null } | null;
  } | null;
  meta?: {
    actorEmail?: string;
    actorRole?: string;
    actorOrgRole?: string | null;
    items?: Array<{
      itemId: string | null;
      productId: string;
      changeType?: "ADDED" | "REMOVED" | "UPDATED";
      productName: string;
      oldQuantity: number;
      newQuantity: number;
    }>;
  } | null;
};

type EditableRow = {
  key: string;
  productId: string;
  quantity: number;
};

export function DispatchDetail({
  dispatch: d,
  onConfirm,
  onDispatch,
  onCancel,
  onPadaan,
  onInvoice,
  onReturn,
  actionLoading,
  onItemsUpdated,
}: {
  dispatch: Dispatch;
  onConfirm: () => void;
  onDispatch: () => void;
  onCancel: () => void;
  onPadaan: () => void;
  onInvoice: () => void;
  onReturn: () => void;
  actionLoading: boolean;
  onItemsUpdated: () => Promise<void>;
}) {
  const [editingItems, setEditingItems] = useState(false);
  const [editableRows, setEditableRows] = useState<EditableRow[]>([]);
  const [editableProducts, setEditableProducts] = useState<
    DispatchEditableProduct[]
  >([]);
  const [productSearch, setProductSearch] = useState("");
  const [productsLoading, setProductsLoading] = useState(false);
  const [productLoadError, setProductLoadError] = useState("");
  const [savingItems, setSavingItems] = useState(false);
  const [itemError, setItemError] = useState("");
  const [editLogs, setEditLogs] = useState<ItemEditLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const currentProducts: DispatchEditableProduct[] = d.request.items.map(
      (item) => ({
        id: item.product.id,
        name: item.product.name,
        sku: item.product.sku,
        barcode: item.product.barcode,
        price: item.product.price,
        availableQuantity: Number.MAX_SAFE_INTEGER,
      }),
    );
    setEditableRows(
      d.request.items.map((item) => ({
        key: item.id,
        productId: item.productId,
        quantity: item.approvedQuantity ?? item.quantity,
      })),
    );
    setEditableProducts(currentProducts);
  }, [d]);

  useEffect(() => {
    if (!editingItems) return;
    const timer = window.setTimeout(async () => {
      setProductsLoading(true);
      setProductLoadError("");
      try {
        const response = await wmsFetch(
          `${API}/stock-requests/dispatches/${d.id}/editable-products?search=${encodeURIComponent(productSearch)}`,
        );
        const body = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(
            body.message || "Барааны жагсаалт авахад алдаа гарлаа",
          );
        const available = Array.isArray(body.products)
          ? (body.products as DispatchEditableProduct[])
          : [];
        const currentProducts: DispatchEditableProduct[] = d.request.items.map(
          (item) => ({
            id: item.product.id,
            name: item.product.name,
            sku: item.product.sku,
            barcode: item.product.barcode,
            price: item.product.price,
            availableQuantity: Number.MAX_SAFE_INTEGER,
          }),
        );
        setEditableProducts(
          Array.from(
            new Map(
              [...currentProducts, ...available].map((product) => [
                product.id,
                product,
              ]),
            ).values(),
          ),
        );
      } catch (error) {
        setProductLoadError(
          error instanceof Error
            ? error.message
            : "Барааны жагсаалт авахад алдаа гарлаа",
        );
      } finally {
        setProductsLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [d.id, d.request.items, editingItems, productSearch]);

  const loadEditLogs = async () => {
    const response = await wmsFetch(
      `${API}/stock-requests/dispatches/${d.id}/item-edit-logs`,
    );
    if (response.ok) {
      const body = await response.json();
      setEditLogs(Array.isArray(body.logs) ? (body.logs as ItemEditLog[]) : []);
    }
  };

  const saveItems = async () => {
    if (
      editableRows.length === 0 ||
      editableRows.some((row) => !row.productId || row.quantity < 1)
    ) {
      setItemError("Дор хаяж нэг бараа сонгож, зөв тоо оруулна уу");
      return;
    }
    setSavingItems(true);
    setItemError("");
    try {
      const response = await wmsFetch(
        `${API}/stock-requests/dispatches/${d.id}/items`,
        {
          method: "PATCH",
          body: JSON.stringify({
            items: editableRows.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          }),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(body.message || "Бараа засахад алдаа гарлаа");
      setEditingItems(false);
      await onItemsUpdated();
      await loadEditLogs();
    } catch (error) {
      setItemError(
        error instanceof Error ? error.message : "Бараа засахад алдаа гарлаа",
      );
    } finally {
      setSavingItems(false);
    }
  };
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
  const editableTotalQty = editableRows.reduce(
    (sum, row) => sum + (Number.isFinite(row.quantity) ? row.quantity : 0),
    0,
  );
  const editableTotalAmt = editableRows.reduce((sum, row) => {
    const product = editableProducts.find((item) => item.id === row.productId);
    return sum + (product ? Number(product.price) * row.quantity : 0);
  }, 0);
  const paymentStarted = Boolean(
    d.request.payment &&
    (d.request.payment.status !== "PENDING" ||
      Number(d.request.payment.paidAmount) > 0 ||
      d.request.payment.transactionId ||
      d.request.payment.paymentMethod),
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
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase text-slate-400">
            Барааны жагсаалт
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowHistory((current) => !current);
                if (!showHistory) void loadEditLogs();
              }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <History className="h-3.5 w-3.5" />
              Засварын түүх
            </button>
            {d.status === "PENDING" && !editingItems && (
              <button
                onClick={() => {
                  setItemError("");
                  setProductSearch("");
                  setEditingItems(true);
                }}
                disabled={paymentStarted}
                title={
                  paymentStarted
                    ? "Төлбөрийн үйлдэл эхэлсэн тул бараа засах боломжгүй"
                    : "Барааны нэр төрөл болон тоо засах"
                }
                className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                <Pencil className="h-3.5 w-3.5" />
                Бараа засах
              </button>
            )}
          </div>
        </div>
        {itemError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {itemError}
          </div>
        )}
        {d.status === "PENDING" && paymentStarted && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            QR эсвэл төлбөрийн үйлдэл эхэлсэн тул бараа нэмэх, хасах, солих
            боломжгүй. Хуучин төлбөрийг санхүүгийн ажилтнаар шалгуулсны дараа
            шийдвэрлэнэ.
          </div>
        )}
        {showHistory && (
          <div className="mb-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            {editLogs.length === 0 ? (
              <p className="text-xs text-slate-500">Засварын түүх алга.</p>
            ) : (
              editLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600"
                >
                  <div className="flex justify-between gap-3">
                    <strong className="text-slate-800">
                      {log.user?.profile?.fullName ||
                        log.user?.email ||
                        log.meta?.actorEmail ||
                        "Ажилтан"}
                    </strong>
                    <span>
                      {new Date(log.createdAt).toLocaleString("mn-MN")}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-500">
                    Эрх: {log.meta?.actorRole || "—"}
                    {log.meta?.actorOrgRole
                      ? ` / ${log.meta.actorOrgRole}`
                      : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {(log.meta?.items || []).map((item) => (
                      <span key={`${log.id}-${item.productId}`}>
                        {item.changeType === "ADDED" && "Нэмсэн: "}
                        {item.changeType === "REMOVED" && "Хассан: "}
                        {item.productName}: <b>{item.oldQuantity}</b> →{" "}
                        <b>{item.newQuantity}</b>
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        <div
          className={`rounded-lg border border-slate-200 ${editingItems ? "overflow-visible" : "overflow-hidden"}`}
        >
          <table
            className={`w-full text-sm ${editingItems ? "table-fixed" : ""}`}
          >
            {editingItems && (
              <colgroup>
                <col className="w-12" />
                <col />
                <col className="w-24" />
                <col className="w-24" />
                <col className="w-28" />
                <col className="w-12" />
              </colgroup>
            )}
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">
                  №
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">
                  Бүтээгдэхүүн
                </th>
                {!editingItems && (
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600">
                    SKU
                  </th>
                )}
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">
                  Тоо
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">
                  Үнэ
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">
                  Нийт
                </th>
                {editingItems && <th className="w-12" aria-label="Үйлдэл" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {editingItems
                ? editableRows.map((row, idx) => {
                    const product = editableProducts.find(
                      (item) => item.id === row.productId,
                    );
                    return (
                      <tr key={row.key} className="bg-white align-middle">
                        <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                        <td className="min-w-0 px-2 py-2">
                          <DispatchProductPicker
                            products={editableProducts}
                            value={row.productId}
                            loading={productsLoading}
                            error={productLoadError}
                            excludedIds={
                              new Set(
                                editableRows
                                  .filter((item) => item.key !== row.key)
                                  .map((item) => item.productId)
                                  .filter(Boolean),
                              )
                            }
                            onSearchChange={setProductSearch}
                            onChange={(productId) =>
                              setEditableRows((current) =>
                                current.map((item) =>
                                  item.key === row.key
                                    ? { ...item, productId }
                                    : item,
                                ),
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min={1}
                            max={product?.availableQuantity || 100000}
                            value={row.quantity}
                            onChange={(event) =>
                              setEditableRows((current) =>
                                current.map((item) =>
                                  item.key === row.key
                                    ? {
                                        ...item,
                                        quantity: Number(event.target.value),
                                      }
                                    : item,
                                ),
                              )
                            }
                            aria-label={`${product?.name || "Бараа"}-ны тоо`}
                            className="h-10 w-20 rounded-lg border border-slate-200 px-2 text-right font-bold outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          />
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {product
                            ? `₮${Number(product.price).toLocaleString()}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800">
                          {product
                            ? `₮${(row.quantity * Number(product.price)).toLocaleString()}`
                            : "—"}
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEditableRows((current) =>
                                current.filter((item) => item.key !== row.key),
                              )
                            }
                            disabled={editableRows.length === 1}
                            aria-label={`${product?.name || "Бараа"} хасах`}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                : d.request.items.map((item, idx) => {
                    const qty = item.approvedQuantity || item.quantity;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 text-slate-500">
                          {idx + 1}
                        </td>
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
              {editingItems && (
                <tr>
                  <td colSpan={6} className="p-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEditableRows((current) => [
                          ...current,
                          {
                            key: `new-${crypto.randomUUID()}`,
                            productId: "",
                            quantity: 1,
                          },
                        ])
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-blue-300 py-3 text-sm font-bold text-blue-700 transition hover:border-blue-500 hover:bg-blue-50"
                    >
                      <Plus className="h-4 w-4" /> Бараа нэмэх
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="border-t-2 border-slate-200 bg-slate-50">
              <tr>
                <td
                  colSpan={editingItems ? 2 : 3}
                  className="px-4 py-3 text-right font-bold text-slate-700"
                >
                  Нийт:
                </td>
                <td className="px-4 py-3 text-right font-bold text-slate-800">
                  {editingItems ? editableTotalQty : totalQty}
                </td>
                <td></td>
                <td className="px-4 py-3 text-right font-bold text-blue-600">
                  ₮
                  {(editingItems
                    ? editableTotalAmt
                    : totalAmt
                  ).toLocaleString()}
                </td>
                {editingItems && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
        {editingItems && (
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => {
                setEditableRows(
                  d.request.items.map((item) => ({
                    key: item.id,
                    productId: item.productId,
                    quantity: item.approvedQuantity ?? item.quantity,
                  })),
                );
                setItemError("");
                setEditingItems(false);
              }}
              disabled={savingItems}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600"
            >
              <X className="h-3.5 w-3.5" /> Цуцлах
            </button>
            <button
              onClick={() => void saveItems()}
              disabled={savingItems}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {savingItems ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Хадгалах
            </button>
          </div>
        )}
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
