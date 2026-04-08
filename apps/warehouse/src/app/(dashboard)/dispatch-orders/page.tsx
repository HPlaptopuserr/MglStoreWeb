"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Phone,
  MapPin,
  FileText,
  Printer,
  ChevronRight,
  AlertTriangle,
  Send,
  Ban,
} from "lucide-react";
import { API, wmsFetch } from "@/lib/api";

/* ───── types ───── */
type DispatchItem = {
  id: string;
  productId: string;
  quantity: number;
  approvedQuantity: number | null;
  product: {
    id: string;
    name: string;
    sku: string | null;
    price: number;
    images?: { url: string }[];
  };
};

type Dispatch = {
  id: string;
  dispatchNumber: string;
  status: "PENDING" | "CONFIRMED" | "DISPATCHED" | "DELIVERED" | "CANCELLED";
  driverName: string | null;
  driverPhone: string | null;
  vehicleNumber: string | null;
  note: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  request: {
    id: string;
    requestNumber: string;
    deliveryAddress: string | null;
    deliveryPhone: string | null;
    note: string | null;
    items: DispatchItem[];
    organization: { id: string; name: string; slug?: string };
    requestedBy: { id: string; email: string; profile?: { fullName: string; phoneNumber?: string } } | null;
    payment?: {
      invoiceNumber: string;
      totalAmount: string | number;
      paidAmount: string | number;
      status: string;
    } | null;
  };
  warehouse: { id: string; name: string; address?: string; phone?: string };
  organization: { id: string; name: string; phone?: string };
  driver?: { id: string; email: string; profile?: { fullName: string; phoneNumber?: string } } | null;
};

type WarehouseOption = { id: string; name: string };

const STATUS_MAP: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  PENDING: {
    label: "Хүлээгдэж буй",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: Clock,
  },
  CONFIRMED: {
    label: "Баталгаажсан",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    icon: CheckCircle2,
  },
  DISPATCHED: {
    label: "Илгээгдсэн",
    color: "text-purple-700",
    bg: "bg-purple-50 border-purple-200",
    icon: Truck,
  },
  DELIVERED: {
    label: "Хүргэгдсэн",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "Цуцлагдсан",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    icon: XCircle,
  },
};

const STEPS = [
  { key: "PENDING", label: "Хүлээгдэж буй", color: "amber", icon: Clock },
  { key: "CONFIRMED", label: "Баталгаажсан", color: "blue", icon: CheckCircle2 },
  { key: "DISPATCHED", label: "Илгээгдсэн", color: "purple", icon: Truck },
  { key: "DELIVERED", label: "Хүргэгдсэн", color: "green", icon: CheckCircle2 },
] as const;

function stepIndex(status: string): number {
  const idx = STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : -1;
}

export default function DispatchOrdersPage() {
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(false);

  // Detail / action modals
  const [selectedDispatch, setSelectedDispatch] = useState<Dispatch | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [showPadaan, setShowPadaan] = useState(false);
  const [showDeliveredList, setShowDeliveredList] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Driver form
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");

  // ───── Load warehouses ─────
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("wms_user") || "{}");
    if (user.warehouseId) {
      setWarehouses([{ id: user.warehouseId, name: user.warehouseName || "Агуулах" }]);
      setSelectedWarehouseId(user.warehouseId);
    } else {
      wmsFetch(`${API}/warehouses`)
        .then((r) => r.json())
        .then((data) => {
          const list = Array.isArray(data) ? data : data.warehouses || [];
          setWarehouses(list);
          if (list.length > 0) setSelectedWarehouseId(list[0].id);
        })
        .catch(() => {});
    }
  }, []);

  // ───── Fetch dispatches when warehouse changes ─────
  useEffect(() => {
    if (!selectedWarehouseId) return;
    fetchDispatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWarehouseId]);

  const fetchDispatches = async () => {
    setLoading(true);
    try {
      const res = await wmsFetch(
        `${API}/stock-requests/warehouse/${selectedWarehouseId}/dispatches`,
      );
      if (res.ok) {
        setDispatches(await res.json());
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  // ───── Actions ─────
  const confirmDispatch = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await wmsFetch(`${API}/stock-requests/dispatches/${id}/confirm`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      if (res.ok) {
        await fetchDispatches();
        setShowDetail(false);
      } else {
        const err = await res.json();
        alert(err.message || "Алдаа гарлаа");
      }
    } catch {
      alert("Сүлжээний алдаа");
    } finally {
      setActionLoading(false);
    }
  };

  const dispatchWithDriver = async (id: string) => {
    if (!driverName.trim() || !driverPhone.trim()) {
      alert("Жолоочийн нэр, утас шаардлагатай");
      return;
    }
    setActionLoading(true);
    try {
      const res = await wmsFetch(`${API}/stock-requests/dispatches/${id}/dispatch`, {
        method: "PATCH",
        body: JSON.stringify({
          driverName: driverName.trim(),
          driverPhone: driverPhone.trim(),
          vehicleNumber: vehicleNumber.trim() || undefined,
        }),
      });
      if (res.ok) {
        setShowDriverForm(false);
        setDriverName("");
        setDriverPhone("");
        setVehicleNumber("");
        await fetchDispatches();
        setShowDetail(false);
      } else {
        const err = await res.json();
        alert(err.message || "Алдаа гарлаа");
      }
    } catch {
      alert("Сүлжээний алдаа");
    } finally {
      setActionLoading(false);
    }
  };

  const deliverDispatch = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await wmsFetch(`${API}/stock-requests/dispatches/${id}/deliver`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      if (res.ok) {
        await fetchDispatches();
        setShowDetail(false);
      } else {
        const err = await res.json();
        alert(err.message || "Алдаа гарлаа");
      }
    } catch {
      alert("Сүлжээний алдаа");
    } finally {
      setActionLoading(false);
    }
  };

  const cancelDispatch = async (id: string) => {
    if (!confirm("Илгээмжийг цуцлах уу?")) return;
    setActionLoading(true);
    try {
      const res = await wmsFetch(`${API}/stock-requests/dispatches/${id}/cancel`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      if (res.ok) {
        await fetchDispatches();
        setShowDetail(false);
      } else {
        const err = await res.json();
        alert(err.message || "Алдаа гарлаа");
      }
    } catch {
      alert("Сүлжээний алдаа");
    } finally {
      setActionLoading(false);
    }
  };

  const openDetail = (d: Dispatch) => {
    setSelectedDispatch(d);
    setShowDetail(true);
    setShowDriverForm(false);
    setShowPadaan(false);
  };

  const totalItems = (d: Dispatch) =>
    d.request.items.reduce((s, i) => s + (i.approvedQuantity || i.quantity), 0);

  const totalAmount = (d: Dispatch) =>
    d.request.items.reduce(
      (s, i) => s + (i.approvedQuantity || i.quantity) * Number(i.product.price),
      0,
    );

  // ───── Render ─────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Илгээмжийн захиалгууд</h1>
          <p className="mt-1 text-sm text-slate-500">
            Бараа татах хүсэлтээр ирсэн илгээмжийн захиалгуудыг удирдах
          </p>
        </div>
        {warehouses.length > 1 && (
          <select
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* 4-Level Status Board */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          {/* Summary stat bar */}
          <div className="grid grid-cols-4 gap-3">
            {STEPS.map((step) => {
              const count = dispatches.filter((d) => d.status === step.key).length;
              const StIcon = step.icon;
              const colorMap: Record<string, string> = {
                amber: "bg-amber-50 border-amber-200 text-amber-700",
                blue: "bg-blue-50 border-blue-200 text-blue-700",
                purple: "bg-purple-50 border-purple-200 text-purple-700",
                green: "bg-green-50 border-green-200 text-green-700",
              };
              const isDelivered = step.key === "DELIVERED";
              return (
                <div
                  key={step.key}
                  onClick={isDelivered && count > 0 ? () => setShowDeliveredList(true) : undefined}
                  className={`flex items-center gap-3 rounded-xl border p-4 ${colorMap[step.color]}${
                    isDelivered && count > 0 ? " cursor-pointer hover:shadow-md transition-shadow" : ""
                  }`}
                >
                  <StIcon className="h-5 w-5" />
                  <div>
                    <p className="text-2xl font-black">{count}</p>
                    <p className="text-xs font-bold opacity-80">{step.label}</p>
                  </div>
                  {isDelivered && count > 0 && (
                    <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Cancelled count if any */}
          {dispatches.filter((d) => d.status === "CANCELLED").length > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
              <XCircle className="h-4 w-4" />
              <span className="font-medium">
                {dispatches.filter((d) => d.status === "CANCELLED").length} цуцлагдсан илгээмж
              </span>
            </div>
          )}

          {/* 4-column pipeline board */}
          <div className="grid grid-cols-4 gap-4 items-start">
            {STEPS.map((step, colIdx) => {
              const colDispatches = dispatches.filter((d) => d.status === step.key);
              const StIcon = step.icon;
              const headerColors: Record<string, string> = {
                amber: "bg-amber-500",
                blue: "bg-blue-500",
                purple: "bg-purple-500",
                green: "bg-green-500",
              };
              return (
                <div key={step.key} className="space-y-3">
                  {/* Column header */}
                  <div className="flex items-center gap-2">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${headerColors[step.color]} text-white`}>
                      <StIcon className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-700">{step.label}</h3>
                    <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
                      {colDispatches.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2.5 min-h-[120px]">
                    {colDispatches.length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-8">
                        <Package className="mb-2 h-8 w-8 text-slate-200" />
                        <p className="text-xs text-slate-400">Хоосон</p>
                      </div>
                    ) : (
                      colDispatches.map((d) => (
                        <div
                          key={d.id}
                          onClick={() => openDetail(d)}
                          className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                        >
                          {/* Stepper mini */}
                          <div className="flex items-center gap-0.5 mb-2.5">
                            {STEPS.map((s, i) => {
                              const current = colIdx;
                              const done = i < current;
                              const active = i === current;
                              return (
                                <div key={s.key} className="flex items-center flex-1 last:flex-none">
                                  <div
                                    className={`h-2 w-2 rounded-full ${
                                      done
                                        ? "bg-emerald-400"
                                        : active
                                          ? "bg-blue-500 ring-2 ring-blue-200"
                                          : "bg-slate-200"
                                    }`}
                                  />
                                  {i < STEPS.length - 1 && (
                                    <div
                                      className={`mx-0.5 h-0.5 flex-1 rounded-full ${
                                        done ? "bg-emerald-300" : "bg-slate-200"
                                      }`}
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <p className="text-sm font-bold text-slate-800 mb-1">
                            {d.dispatchNumber}
                          </p>
                          <p className="text-xs text-slate-500 mb-1">
                            {d.request.organization.name}
                          </p>
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>{totalItems(d)} ш</span>
                            <span>₮{totalAmount(d).toLocaleString()}</span>
                          </div>

                          {/* Quick items */}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {d.request.items.slice(0, 2).map((item) => (
                              <span
                                key={item.id}
                                className="rounded bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500"
                              >
                                {item.product.name.slice(0, 15)}
                                {item.product.name.length > 15 ? "…" : ""} ×{item.approvedQuantity || item.quantity}
                              </span>
                            ))}
                            {d.request.items.length > 2 && (
                              <span className="text-[10px] text-slate-400">
                                +{d.request.items.length - 2}
                              </span>
                            )}
                          </div>

                          {/* Driver info */}
                          {d.driverName && (
                            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-purple-600">
                              <Truck className="h-3 w-3" />
                              {d.driverName}
                            </div>
                          )}

                          <p className="mt-1.5 text-[10px] text-slate-300">
                            {new Date(d.createdAt).toLocaleDateString("mn-MN")}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ───── Delivered List Modal ───── */}
      {showDeliveredList && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowDeliveredList(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500 text-white">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Хүргэгдсэн илгээмжүүд</h2>
                  <p className="text-sm text-slate-500">
                    Нийт {dispatches.filter((d) => d.status === "DELIVERED").length} илгээмж
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeliveredList(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Хаах
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-3">
                {dispatches
                  .filter((d) => d.status === "DELIVERED")
                  .sort((a, b) => new Date(b.deliveredAt || b.createdAt).getTime() - new Date(a.deliveredAt || a.createdAt).getTime())
                  .map((d) => {
                    const qty = d.request.items.reduce((s, i) => s + (i.approvedQuantity || i.quantity), 0);
                    const amt = d.request.items.reduce(
                      (s, i) => s + (i.approvedQuantity || i.quantity) * Number(i.product.price),
                      0,
                    );
                    return (
                      <div
                        key={d.id}
                        onClick={() => {
                          setShowDeliveredList(false);
                          openDetail(d);
                        }}
                        className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-green-300 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-slate-800">{d.dispatchNumber}</p>
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[11px] font-medium text-green-700">
                                <CheckCircle2 className="h-3 w-3" />
                                Хүргэгдсэн
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-slate-600">{d.request.organization.name}</p>
                            <p className="text-xs text-slate-400">
                              Хүсэлт: {d.request.requestNumber}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-800">₮{amt.toLocaleString()}</p>
                            <p className="text-xs text-slate-500">{qty} ширхэг</p>
                          </div>
                        </div>

                        {/* Items preview */}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {d.request.items.slice(0, 3).map((item) => (
                            <span
                              key={item.id}
                              className="rounded bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500"
                            >
                              {item.product.name.slice(0, 20)}
                              {item.product.name.length > 20 ? "…" : ""} ×{item.approvedQuantity || item.quantity}
                            </span>
                          ))}
                          {d.request.items.length > 3 && (
                            <span className="text-[11px] text-slate-400">+{d.request.items.length - 3}</span>
                          )}
                        </div>

                        {/* Footer info */}
                        <div className="mt-2.5 flex items-center gap-4 text-xs text-slate-400">
                          {d.driverName && (
                            <span className="flex items-center gap-1">
                              <Truck className="h-3 w-3" />
                              {d.driverName}
                            </span>
                          )}
                          {d.deliveredAt && (
                            <span>
                              Хүргэгдсэн: {new Date(d.deliveredAt).toLocaleString("mn-MN")}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───── Detail Modal ───── */}
      {showDetail && selectedDispatch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowDetail(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <DispatchDetail
              dispatch={selectedDispatch}
              onConfirm={() => confirmDispatch(selectedDispatch.id)}
              onDispatch={() => setShowDriverForm(true)}
              onDeliver={() => deliverDispatch(selectedDispatch.id)}
              onCancel={() => cancelDispatch(selectedDispatch.id)}
              onPadaan={() => setShowPadaan(true)}
              actionLoading={actionLoading}
            />
          </div>
        </div>
      )}

      {/* ───── Driver Assignment Modal ───── */}
      {showDriverForm && selectedDispatch && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowDriverForm(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-bold text-slate-800">Жолооч томилох</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Жолоочийн нэр *
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Нэр"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Утасны дугаар *
                </label>
                <input
                  type="text"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="9999-9999"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Тээврийн хэрэгсэлийн дугаар
                </label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="0000 УНА"
                />
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowDriverForm(false)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Болих
              </button>
              <button
                onClick={() => dispatchWithDriver(selectedDispatch.id)}
                disabled={actionLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Truck className="h-4 w-4" />
                )}
                Илгээх
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───── Padaan / Waybill Modal ───── */}
      {showPadaan && selectedDispatch && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowPadaan(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <PadaanView dispatch={selectedDispatch} onClose={() => setShowPadaan(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   Dispatch Detail Component
   ════════════════════════════════════════════ */
function DispatchDetail({
  dispatch: d,
  onConfirm,
  onDispatch,
  onDeliver,
  onCancel,
  onPadaan,
  actionLoading,
}: {
  dispatch: Dispatch;
  onConfirm: () => void;
  onDispatch: () => void;
  onDeliver: () => void;
  onCancel: () => void;
  onPadaan: () => void;
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
            <h2 className="text-xl font-bold text-slate-800">{d.dispatchNumber}</h2>
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
        <button
          onClick={onPadaan}
          className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Printer className="h-4 w-4" />
          Падаан
        </button>
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
              <div key={step.key} className="flex items-center flex-1 last:flex-none">
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
          <p className="text-xs font-medium uppercase text-slate-400">Байгууллага</p>
          <p className="mt-1 font-medium text-slate-800">{d.request.organization.name}</p>
          {d.request.requestedBy && (
            <p className="text-sm text-slate-500">{d.request.requestedBy.profile?.fullName || d.request.requestedBy.email}</p>
          )}
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase text-slate-400">Хүргэлтийн хаяг</p>
          <p className="mt-1 font-medium text-slate-800">
            {d.request.deliveryAddress || "Тодорхойгүй"}
          </p>
          {d.request.deliveryPhone && (
            <p className="text-sm text-slate-500">{d.request.deliveryPhone}</p>
          )}
        </div>
        {d.driverName && (
          <div className="rounded-lg bg-purple-50 p-3">
            <p className="text-xs font-medium uppercase text-purple-400">Жолооч</p>
            <p className="mt-1 font-medium text-purple-800">{d.driverName}</p>
            <p className="text-sm text-purple-600">
              {d.driverPhone}
              {d.vehicleNumber && ` • ${d.vehicleNumber}`}
            </p>
          </div>
        )}
        {d.request.payment && (
          <div className="rounded-lg bg-green-50 p-3">
            <p className="text-xs font-medium uppercase text-green-400">Төлбөр</p>
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
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">№</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">Бүтээгдэхүүн</th>
                <th className="px-4 py-2.5 text-left font-medium text-slate-600">SKU</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">Тоо</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">Үнэ</th>
                <th className="px-4 py-2.5 text-right font-medium text-slate-600">Нийт</th>
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
                    <td className="px-4 py-2.5 text-right font-bold text-slate-800">{qty}</td>
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
                <td colSpan={3} className="px-4 py-3 text-right font-bold text-slate-700">
                  Нийт:
                </td>
                <td className="px-4 py-3 text-right font-bold text-slate-800">{totalQty}</td>
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
          <button
            onClick={onDeliver}
            disabled={actionLoading}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {actionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Хүргэгдсэн гэж тэмдэглэх
          </button>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   Padaan (Waybill) Print View
   ════════════════════════════════════════════ */
function PadaanView({
  dispatch: d,
  onClose,
}: {
  dispatch: Dispatch;
  onClose: () => void;
}) {
  const totalQty = d.request.items.reduce(
    (s, i) => s + (i.approvedQuantity || i.quantity),
    0,
  );
  const totalAmt = d.request.items.reduce(
    (s, i) => s + (i.approvedQuantity || i.quantity) * Number(i.product.price),
    0,
  );

  const handlePrint = () => {
    const printContent = document.getElementById("padaan-content");
    if (!printContent) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Падаан - ${d.dispatchNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 30px; color: #1e293b; }
          .header { text-align: center; border-bottom: 3px double #334155; padding-bottom: 16px; margin-bottom: 20px; }
          .header h1 { font-size: 24px; margin-bottom: 4px; }
          .header p { color: #64748b; font-size: 13px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
          .info-box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; }
          .info-box .label { font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 600; }
          .info-box .value { font-size: 14px; font-weight: 600; margin-top: 4px; }
          .info-box .sub { font-size: 12px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 13px; }
          th { background: #f1f5f9; font-weight: 600; }
          .text-right { text-align: right; }
          .total-row td { font-weight: 700; background: #f8fafc; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; margin-top: 40px; }
          .sig-box { text-align: center; }
          .sig-line { border-top: 1px solid #94a3b8; margin-top: 60px; padding-top: 8px; font-size: 12px; color: #64748b; }
          .footer { text-align: center; margin-top: 30px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
          @media print { body { padding: 15px; } }
        </style>
      </head>
      <body>${printContent.innerHTML}
        <div class="footer">MGL Store WMS • Хэвлэгдсэн: ${new Date().toLocaleString("mn-MN")}</div>
      </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Падаан / Зарлагын баримт</h2>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Printer className="h-4 w-4" />
            Хэвлэх
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Хаах
          </button>
        </div>
      </div>

      {/* Print Content */}
      <div
        id="padaan-content"
        className="rounded-lg border border-slate-200 bg-white p-6"
      >
        {/* Header */}
        <div className="header mb-5 border-b-2 border-double border-slate-300 pb-4 text-center">
          <h1 className="text-2xl font-bold text-slate-800">ЗАРЛАГЫН ПАДААН</h1>
          <p className="mt-1 text-sm text-slate-500">
            {d.dispatchNumber} •{" "}
            {new Date(d.createdAt).toLocaleDateString("mn-MN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Info Grid */}
        <div className="info-grid mb-5 grid grid-cols-2 gap-4">
          <div className="info-box rounded-lg border border-slate-200 p-3">
            <p className="label text-[11px] font-semibold uppercase text-slate-400">
              Агуулах (Илгээгч)
            </p>
            <p className="value mt-1 text-sm font-semibold text-slate-800">
              {d.warehouse.name}
            </p>
            {d.warehouse.address && (
              <p className="sub text-xs text-slate-500">{d.warehouse.address}</p>
            )}
            {d.warehouse.phone && (
              <p className="sub text-xs text-slate-500">Утас: {d.warehouse.phone}</p>
            )}
          </div>
          <div className="info-box rounded-lg border border-slate-200 p-3">
            <p className="label text-[11px] font-semibold uppercase text-slate-400">
              Хүлээн авагч
            </p>
            <p className="value mt-1 text-sm font-semibold text-slate-800">
              {d.request.organization.name}
            </p>
            {d.request.deliveryAddress && (
              <p className="sub text-xs text-slate-500">{d.request.deliveryAddress}</p>
            )}
            {d.request.deliveryPhone && (
              <p className="sub text-xs text-slate-500">
                Утас: {d.request.deliveryPhone}
              </p>
            )}
          </div>
          {d.driverName && (
            <div className="info-box rounded-lg border border-slate-200 p-3">
              <p className="label text-[11px] font-semibold uppercase text-slate-400">
                Тээвэрлэгч / Жолооч
              </p>
              <p className="value mt-1 text-sm font-semibold text-slate-800">
                {d.driverName}
              </p>
              <p className="sub text-xs text-slate-500">Утас: {d.driverPhone}</p>
              {d.vehicleNumber && (
                <p className="sub text-xs text-slate-500">
                  Тээврийн хэрэгсэл: {d.vehicleNumber}
                </p>
              )}
            </div>
          )}
          <div className="info-box rounded-lg border border-slate-200 p-3">
            <p className="label text-[11px] font-semibold uppercase text-slate-400">
              Хүсэлтийн дугаар
            </p>
            <p className="value mt-1 text-sm font-semibold text-slate-800">
              {d.request.requestNumber}
            </p>
            {d.request.payment && (
              <p className="sub text-xs text-slate-500">
                Нэхэмжлэх: {d.request.payment.invoiceNumber}
              </p>
            )}
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-3 py-2 text-left">№</th>
              <th className="border border-slate-300 px-3 py-2 text-left">
                Бүтээгдэхүүний нэр
              </th>
              <th className="border border-slate-300 px-3 py-2 text-left">SKU</th>
              <th className="border border-slate-300 px-3 py-2 text-right">Тоо ширхэг</th>
              <th className="border border-slate-300 px-3 py-2 text-right">Нэгж үнэ</th>
              <th className="border border-slate-300 px-3 py-2 text-right">Нийт дүн</th>
            </tr>
          </thead>
          <tbody>
            {d.request.items.map((item, idx) => {
              const qty = item.approvedQuantity || item.quantity;
              return (
                <tr key={item.id}>
                  <td className="border border-slate-300 px-3 py-2">{idx + 1}</td>
                  <td className="border border-slate-300 px-3 py-2 font-medium">
                    {item.product.name}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-slate-500">
                    {item.product.sku || "—"}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-right font-bold">
                    {qty}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-right">
                    ₮{Number(item.product.price).toLocaleString()}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-right font-medium">
                    ₮{(qty * Number(item.product.price)).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="total-row bg-slate-50 font-bold">
              <td colSpan={3} className="border border-slate-300 px-3 py-2 text-right">
                Нийт:
              </td>
              <td className="border border-slate-300 px-3 py-2 text-right">{totalQty}</td>
              <td className="border border-slate-300 px-3 py-2"></td>
              <td className="border border-slate-300 px-3 py-2 text-right">
                ₮{totalAmt.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>

        {d.note && (
          <div className="mt-4 text-sm text-slate-600">
            <strong>Тэмдэглэл:</strong> {d.note}
          </div>
        )}

        {/* Signatures */}
        <div className="signatures mt-10 grid grid-cols-3 gap-8">
          <div className="sig-box text-center">
            <div className="sig-line mt-16 border-t border-slate-400 pt-2 text-xs text-slate-500">
              Агуулахын ажилтан
            </div>
          </div>
          <div className="sig-box text-center">
            <div className="sig-line mt-16 border-t border-slate-400 pt-2 text-xs text-slate-500">
              Жолооч / Тээвэрлэгч
            </div>
          </div>
          <div className="sig-box text-center">
            <div className="sig-line mt-16 border-t border-slate-400 pt-2 text-xs text-slate-500">
              Хүлээн авагч
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
