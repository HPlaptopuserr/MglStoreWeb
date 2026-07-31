"use client";

import { useEffect, useMemo, useState } from "react";
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
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { API, wmsFetch } from "@/lib/api";
import {
  DeliveryPackageDialog,
  type DeliveryPackageDetails,
} from "@mgl/ui";
import { fetchDeliveryAssignmentOptions } from "@/features/online-orders/online-order.api";
import type { DeliveryAssignmentPartnership } from "@/features/online-orders/online-order.types";

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
    requestedBy: {
      id: string;
      email: string;
      profile?: { fullName: string; phoneNumber?: string };
    } | null;
    payment?: {
      id?: string;
      invoiceNumber: string;
      totalAmount: string | number;
      paidAmount: string | number;
      status: string;
      paymentMethod?: string | null;
      paidAt?: string | null;
      dueDate?: string | null;
      createdAt?: string;
      confirmedAt?: string | null;
      transactionId?: string | null;
      note?: string | null;
    } | null;
  };
  warehouse: { id: string; name: string; address?: string; phone?: string };
  organization: { id: string; name: string; phone?: string };
  driver?: {
    id: string;
    email: string;
    profile?: { fullName: string; phoneNumber?: string };
  } | null;
};

type ReturnItem = {
  id: string;
  productId: string;
  quantity: number;
  reason: string | null;
  product: { id: string; name: string; sku: string | null; price: number };
};

type DispatchReturnType = {
  id: string;
  returnNumber: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason: string | null;
  note: string | null;
  rejectReason: string | null;
  requestedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  items: ReturnItem[];
  dispatch: {
    dispatchNumber: string;
    driverName: string | null;
    driverPhone: string | null;
    vehicleNumber: string | null;
    request: {
      requestNumber: string;
      deliveryAddress: string | null;
      organization: { id: string; name: string; phone: string | null };
      requestedBy: {
        id: string;
        email: string;
        profile?: { fullName: string; phoneNumber?: string };
      } | null;
    };
  };
  organization: { id: string; name: string; phone: string | null };
  warehouse: { id: string; name: string };
  approvedBy: {
    id: string;
    email: string;
    profile?: { fullName: string };
  } | null;
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
  {
    key: "CONFIRMED",
    label: "Баталгаажсан",
    color: "blue",
    icon: CheckCircle2,
  },
  { key: "DISPATCHED", label: "Илгээгдсэн", color: "purple", icon: Truck },
  { key: "DELIVERED", label: "Хүргэгдсэн", color: "green", icon: CheckCircle2 },
] as const;

function stepIndex(status: string): number {
  const idx = STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : -1;
}

function formatMoney(value: string | number | null | undefined) {
  return `₮${Number(value || 0).toLocaleString()}`;
}

function paymentStatusLabel(status?: string | null) {
  switch (status) {
    case "PAID":
      return "Төлсөн";
    case "PENDING":
      return "Төлөөгүй";
    case "FAILED":
      return "Амжилтгүй";
    case "REFUNDED":
      return "Буцаасан";
    case "CANCELLED":
      return "Цуцлагдсан";
    default:
      return status || "-";
  }
}

function paymentStatusClass(status?: string | null) {
  switch (status) {
    case "PAID":
      return "border-green-200 bg-green-50 text-green-700";
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "FAILED":
    case "CANCELLED":
      return "border-red-200 bg-red-50 text-red-700";
    case "REFUNDED":
      return "border-slate-200 bg-slate-50 text-slate-600";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function paymentOutstanding(payment: NonNullable<Dispatch["request"]["payment"]>) {
  return Math.max(
    0,
    Number(payment.totalAmount || 0) - Number(payment.paidAmount || 0),
  );
}

export default function DispatchOrdersPage() {
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(false);

  // Detail / action modals
  const [selectedDispatch, setSelectedDispatch] = useState<Dispatch | null>(
    null,
  );
  const [showDetail, setShowDetail] = useState(false);
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [showPadaan, setShowPadaan] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showDeliveredList, setShowDeliveredList] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Delivery network assignment
  const [deliveryPartnerships, setDeliveryPartnerships] = useState<
    DeliveryAssignmentPartnership[]
  >([]);
  const [selectedPartnershipId, setSelectedPartnershipId] = useState("");
  const [selectedCourierId, setSelectedCourierId] = useState("");
  const [assignmentOptionsLoading, setAssignmentOptionsLoading] =
    useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const selectedPartnership = useMemo(
    () =>
      deliveryPartnerships.find(
        (partnership) => partnership.id === selectedPartnershipId,
      ),
    [deliveryPartnerships, selectedPartnershipId],
  );

  // Returns
  const [activeTab, setActiveTab] = useState<"dispatches" | "returns">(
    "dispatches",
  );
  const [returns, setReturns] = useState<DispatchReturnType[]>([]);
  const [returnsLoading, setReturnsLoading] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnItems, setReturnItems] = useState<
    {
      productId: string;
      quantity: number;
      reason: string;
      maxQty: number;
      name: string;
    }[]
  >([]);
  const [returnReason, setReturnReason] = useState("");
  const [returnNote, setReturnNote] = useState("");
  const [selectedReturn, setSelectedReturn] =
    useState<DispatchReturnType | null>(null);
  const [showReturnDetail, setShowReturnDetail] = useState(false);

  // ───── Load warehouses ─────
  useEffect(() => {
    wmsFetch(`${API}/warehouses`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.warehouses || [];
        setWarehouses(list);
        if (list.length > 0) setSelectedWarehouseId(list[0].id);
      })
      .catch(() => {});
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
  const confirmDispatch = async (
    id: string,
    packageDetails: DeliveryPackageDetails,
  ) => {
    setActionLoading(true);
    try {
      const res = await wmsFetch(
        `${API}/stock-requests/dispatches/${id}/confirm`,
        {
          method: "PATCH",
          body: JSON.stringify(packageDetails),
        },
      );
      if (res.ok) {
        await fetchDispatches();
        setShowPackageDialog(false);
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

  const openDriverAssignment = async () => {
    setShowDriverForm(true);
    setAssignmentOptionsLoading(true);
    setAssignmentError("");
    setSelectedPartnershipId("");
    setSelectedCourierId("");
    try {
      const options = await fetchDeliveryAssignmentOptions();
      setDeliveryPartnerships(
        options.filter(
          (partnership) => partnership.warehouseId === selectedWarehouseId,
        ),
      );
    } catch (error) {
      setAssignmentError(
        error instanceof Error
          ? error.message
          : "Хүргэлтийн сонголт авахад алдаа гарлаа",
      );
    } finally {
      setAssignmentOptionsLoading(false);
    }
  };

  const dispatchWithDriver = async (id: string) => {
    if (!selectedPartnershipId || !selectedCourierId) {
      setAssignmentError("Хүргэлтийн компани болон хүргэгч сонгоно уу");
      return;
    }
    setActionLoading(true);
    setAssignmentError("");
    try {
      const res = await wmsFetch(
        `${API}/stock-requests/dispatches/${id}/dispatch`,
        {
          method: "PATCH",
          body: JSON.stringify({
            partnershipId: selectedPartnershipId,
            courierId: selectedCourierId,
          }),
        },
      );
      if (res.ok) {
        setShowDriverForm(false);
        setSelectedPartnershipId("");
        setSelectedCourierId("");
        await fetchDispatches();
        setShowDetail(false);
      } else {
        const err = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        setAssignmentError(err.message || "Илгээмж хуваарилахад алдаа гарлаа");
      }
    } catch {
      setAssignmentError("Сервертэй холбогдоход алдаа гарлаа");
    } finally {
      setActionLoading(false);
    }
  };

  const cancelDispatch = async (id: string) => {
    if (!confirm("Илгээмжийг цуцлах уу?")) return;
    setActionLoading(true);
    try {
      const res = await wmsFetch(
        `${API}/stock-requests/dispatches/${id}/cancel`,
        {
          method: "PATCH",
          body: JSON.stringify({}),
        },
      );
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
    setShowInvoice(false);
  };

  const openInvoice = (d: Dispatch) => {
    setSelectedDispatch(d);
    setShowInvoice(true);
  };

  // ───── Returns ─────
  const fetchReturns = async () => {
    if (!selectedWarehouseId) return;
    setReturnsLoading(true);
    try {
      const res = await wmsFetch(
        `${API}/stock-requests/warehouse/${selectedWarehouseId}/returns`,
      );
      if (res.ok) setReturns(await res.json());
    } catch {
      /* ignore */
    } finally {
      setReturnsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "returns" && selectedWarehouseId) fetchReturns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedWarehouseId]);

  const openReturnForm = (d: Dispatch) => {
    // Build return items from dispatch items with max qty
    const items = d.request.items.map((i) => ({
      productId: i.productId,
      quantity: 0,
      reason: "",
      maxQty: i.approvedQuantity || i.quantity,
      name: i.product.name,
    }));
    setReturnItems(items);
    setReturnReason("");
    setReturnNote("");
    setShowReturnForm(true);
  };

  const submitReturn = async () => {
    if (!selectedDispatch) return;
    const itemsToReturn = returnItems.filter((i) => i.quantity > 0);
    if (itemsToReturn.length === 0) {
      alert("Буцаах бараа сонгоно уу");
      return;
    }
    setActionLoading(true);
    try {
      const res = await wmsFetch(
        `${API}/stock-requests/dispatches/${selectedDispatch.id}/returns`,
        {
          method: "POST",
          body: JSON.stringify({
            items: itemsToReturn.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              reason: i.reason || undefined,
            })),
            reason: returnReason || undefined,
            note: returnNote || undefined,
          }),
        },
      );
      if (res.ok) {
        setShowReturnForm(false);
        setShowDetail(false);
        alert("Буцаалт амжилттай үүслээ. Батлагдахыг хүлээж байна.");
        if (activeTab === "returns") fetchReturns();
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

  const approveReturn = async (id: string) => {
    if (!confirm("Буцаалтыг батлах уу? Бараа агуулахын нөөцөд буцна.")) return;
    setActionLoading(true);
    try {
      const res = await wmsFetch(
        `${API}/stock-requests/returns/${id}/approve`,
        {
          method: "PATCH",
          body: JSON.stringify({}),
        },
      );
      if (res.ok) {
        await fetchReturns();
        setShowReturnDetail(false);
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

  const rejectReturn = async (id: string) => {
    const reason = prompt("Татгалзсан шалтгаан:");
    if (reason === null) return;
    setActionLoading(true);
    try {
      const res = await wmsFetch(`${API}/stock-requests/returns/${id}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ rejectReason: reason }),
      });
      if (res.ok) {
        await fetchReturns();
        setShowReturnDetail(false);
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

  const totalItems = (d: Dispatch) =>
    d.request.items.reduce((s, i) => s + (i.approvedQuantity || i.quantity), 0);

  const totalAmount = (d: Dispatch) =>
    d.request.items.reduce(
      (s, i) =>
        s + (i.approvedQuantity || i.quantity) * Number(i.product.price),
      0,
    );

  // ───── Render ─────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Илгээмжийн захиалгууд
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Бараа татах хүсэлтээр ирсэн илгээмжийн захиалгуудыг удирдах
          </p>
        </div>
        <div className="flex items-center gap-3">
          {warehouses.length > 1 && (
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setActiveTab("dispatches")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
            activeTab === "dispatches"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Truck className="h-4 w-4" />
          Илгээмжүүд
        </button>
        <button
          onClick={() => setActiveTab("returns")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
            activeTab === "returns"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <RotateCcw className="h-4 w-4" />
          Буцаалтууд
          {returns.filter((r) => r.status === "PENDING").length > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
              {returns.filter((r) => r.status === "PENDING").length}
            </span>
          )}
        </button>
      </div>

      {/* 4-Level Status Board */}
      {activeTab === "dispatches" &&
        (loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <>
            {/* Summary stat bar */}
            <div className="grid grid-cols-4 gap-3">
              {STEPS.map((step) => {
                const count = dispatches.filter(
                  (d) => d.status === step.key,
                ).length;
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
                    onClick={
                      isDelivered && count > 0
                        ? () => setShowDeliveredList(true)
                        : undefined
                    }
                    className={`flex items-center gap-3 rounded-xl border p-4 ${colorMap[step.color]}${
                      isDelivered && count > 0
                        ? " cursor-pointer hover:shadow-md transition-shadow"
                        : ""
                    }`}
                  >
                    <StIcon className="h-5 w-5" />
                    <div>
                      <p className="text-2xl font-black">{count}</p>
                      <p className="text-xs font-bold opacity-80">
                        {step.label}
                      </p>
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
                  {dispatches.filter((d) => d.status === "CANCELLED").length}{" "}
                  цуцлагдсан илгээмж
                </span>
              </div>
            )}

            {/* 4-column pipeline board */}
            <div className="grid grid-cols-4 gap-4 items-start">
              {STEPS.map((step, colIdx) => {
                const colDispatches = dispatches.filter(
                  (d) => d.status === step.key,
                );
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
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-lg ${headerColors[step.color]} text-white`}
                      >
                        <StIcon className="h-4 w-4" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-700">
                        {step.label}
                      </h3>
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
                                  <div
                                    key={s.key}
                                    className="flex items-center flex-1 last:flex-none"
                                  >
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
                                          done
                                            ? "bg-emerald-300"
                                            : "bg-slate-200"
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
                                  {item.product.name.length > 15 ? "…" : ""} ×
                                  {item.approvedQuantity || item.quantity}
                                </span>
                              ))}
                              {d.request.items.length > 2 && (
                                <span className="text-[10px] text-slate-400">
                                  +{d.request.items.length - 2}
                                </span>
                              )}
                            </div>

                            {d.request.payment && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openInvoice(d);
                                }}
                                className="mt-2 flex w-full items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-2 py-1.5 text-left text-[11px] font-semibold text-blue-700 transition-colors hover:border-blue-200 hover:bg-blue-100"
                              >
                                <FileText className="h-3.5 w-3.5 shrink-0" />
                                <span className="min-w-0 flex-1 truncate">
                                  {d.request.payment.invoiceNumber}
                                </span>
                                <span
                                  className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] ${paymentStatusClass(
                                    d.request.payment.status,
                                  )}`}
                                >
                                  {paymentStatusLabel(d.request.payment.status)}
                                </span>
                              </button>
                            )}

                            {/* Driver info */}
                            {d.driverName && (
                              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-purple-600">
                                <Truck className="h-3 w-3" />
                                {d.driverName}
                              </div>
                            )}

                            <p className="mt-1.5 text-[10px] text-slate-300">
                              {new Date(d.createdAt).toLocaleDateString(
                                "mn-MN",
                              )}
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
        ))}

      {/* ═══════ Returns Tab ═══════ */}
      {activeTab === "returns" &&
        (returnsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Returns summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: "Хүлээгдэж буй",
                  status: "PENDING",
                  color: "bg-amber-50 border-amber-200 text-amber-700",
                  Icon: Clock,
                },
                {
                  label: "Батлагдсан",
                  status: "APPROVED",
                  color: "bg-green-50 border-green-200 text-green-700",
                  Icon: CheckCircle2,
                },
                {
                  label: "Татгалзсан",
                  status: "REJECTED",
                  color: "bg-red-50 border-red-200 text-red-700",
                  Icon: XCircle,
                },
              ].map(({ label, status, color, Icon }) => (
                <div
                  key={status}
                  className={`flex items-center gap-3 rounded-xl border p-4 ${color}`}
                >
                  <Icon className="h-5 w-5" />
                  <div>
                    <p className="text-2xl font-black">
                      {returns.filter((r) => r.status === status).length}
                    </p>
                    <p className="text-xs font-bold opacity-80">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Returns list */}
            {returns.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-16">
                <RotateCcw className="mb-3 h-12 w-12 text-slate-200" />
                <p className="text-sm font-medium text-slate-400">
                  Буцаалт байхгүй
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {returns.map((r) => {
                  const totalQty = r.items.reduce((s, i) => s + i.quantity, 0);
                  const totalAmt = r.items.reduce(
                    (s, i) => s + i.quantity * Number(i.product.price),
                    0,
                  );
                  const statusStyle =
                    r.status === "PENDING"
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : r.status === "APPROVED"
                        ? "bg-green-50 border-green-200 text-green-700"
                        : "bg-red-50 border-red-200 text-red-700";
                  const statusLabel =
                    r.status === "PENDING"
                      ? "Хүлээгдэж буй"
                      : r.status === "APPROVED"
                        ? "Батлагдсан"
                        : "Татгалзсан";
                  return (
                    <div
                      key={r.id}
                      onClick={() => {
                        setSelectedReturn(r);
                        setShowReturnDetail(true);
                      }}
                      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-800">
                              {r.returnNumber}
                            </p>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusStyle}`}
                            >
                              {statusLabel}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-600">
                            {r.organization.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            Илгээмж: {r.dispatch.dispatchNumber}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-800">
                            ₮{totalAmt.toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-500">
                            {totalQty} ширхэг
                          </p>
                        </div>
                      </div>
                      {/* Items preview */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {r.items.slice(0, 3).map((item) => (
                          <span
                            key={item.id}
                            className="rounded bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500"
                          >
                            {item.product.name.slice(0, 20)}
                            {item.product.name.length > 20 ? "…" : ""} ×
                            {item.quantity}
                          </span>
                        ))}
                        {r.items.length > 3 && (
                          <span className="text-[11px] text-slate-400">
                            +{r.items.length - 3}
                          </span>
                        )}
                      </div>
                      {r.reason && (
                        <p className="mt-2 text-xs text-slate-400">
                          Шалтгаан: {r.reason}
                        </p>
                      )}
                      <p className="mt-1.5 text-[10px] text-slate-300">
                        {new Date(r.createdAt).toLocaleString("mn-MN")}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

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
                  <h2 className="text-lg font-bold text-slate-800">
                    Хүргэгдсэн илгээмжүүд
                  </h2>
                  <p className="text-sm text-slate-500">
                    Нийт{" "}
                    {dispatches.filter((d) => d.status === "DELIVERED").length}{" "}
                    илгээмж
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
                  .sort(
                    (a, b) =>
                      new Date(b.deliveredAt || b.createdAt).getTime() -
                      new Date(a.deliveredAt || a.createdAt).getTime(),
                  )
                  .map((d) => {
                    const qty = d.request.items.reduce(
                      (s, i) => s + (i.approvedQuantity || i.quantity),
                      0,
                    );
                    const amt = d.request.items.reduce(
                      (s, i) =>
                        s +
                        (i.approvedQuantity || i.quantity) *
                          Number(i.product.price),
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
                              <p className="text-sm font-bold text-slate-800">
                                {d.dispatchNumber}
                              </p>
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[11px] font-medium text-green-700">
                                <CheckCircle2 className="h-3 w-3" />
                                Хүргэгдсэн
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-slate-600">
                              {d.request.organization.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              Хүсэлт: {d.request.requestNumber}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-800">
                              ₮{amt.toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-500">
                              {qty} ширхэг
                            </p>
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
                              {item.product.name.length > 20 ? "…" : ""} ×
                              {item.approvedQuantity || item.quantity}
                            </span>
                          ))}
                          {d.request.items.length > 3 && (
                            <span className="text-[11px] text-slate-400">
                              +{d.request.items.length - 3}
                            </span>
                          )}
                        </div>

                        {d.request.payment && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setShowDeliveredList(false);
                              openInvoice(d);
                            }}
                            className="mt-2 flex w-full items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-left text-xs font-semibold text-blue-700 transition-colors hover:border-blue-200 hover:bg-blue-100"
                          >
                            <FileText className="h-4 w-4 shrink-0" />
                            <span className="min-w-0 flex-1 truncate">
                              Нэхэмжлэх: {d.request.payment.invoiceNumber}
                            </span>
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${paymentStatusClass(
                                d.request.payment.status,
                              )}`}
                            >
                              {paymentStatusLabel(d.request.payment.status)}
                            </span>
                          </button>
                        )}

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
                              Хүргэгдсэн:{" "}
                              {new Date(d.deliveredAt).toLocaleString("mn-MN")}
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
              onConfirm={() => setShowPackageDialog(true)}
              onDispatch={() => void openDriverAssignment()}
              onCancel={() => cancelDispatch(selectedDispatch.id)}
              onPadaan={() => setShowPadaan(true)}
              onInvoice={() => setShowInvoice(true)}
              onReturn={() => openReturnForm(selectedDispatch)}
              actionLoading={actionLoading}
            />
          </div>
        </div>
      )}

      {showPackageDialog && selectedDispatch && (
        <DeliveryPackageDialog
          orderNumber={selectedDispatch.dispatchNumber}
          submitting={actionLoading}
          onClose={() => {
            if (!actionLoading) setShowPackageDialog(false);
          }}
          onSubmit={(details) =>
            confirmDispatch(selectedDispatch.id, details)
          }
        />
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
            <div className="mb-5 flex items-start gap-3">
              <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Хүргэлт хуваарилах
                </h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  Бүртгэлтэй хүргэлтийн байгууллага, хүргэгч сонгоно уу.
                </p>
              </div>
            </div>

            {assignmentOptionsLoading ? (
              <div className="flex h-36 items-center justify-center rounded-xl bg-slate-50">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : deliveryPartnerships.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                Энэ агуулахад идэвхтэй хүргэлтийн байгууллага эсвэл бүртгэлтэй
                хүргэгч алга. “Хүргэлтийн сүлжээ” хэсэгт эхлээд хамтын ажиллагаа
                болон хүргэгчээ бүртгэнэ үү.
              </div>
            ) : (
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Хүргэлтийн байгууллага
                  </span>
                  <select
                    value={selectedPartnershipId}
                    onChange={(event) => {
                      setSelectedPartnershipId(event.target.value);
                      setSelectedCourierId("");
                      setAssignmentError("");
                    }}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Байгууллага сонгох</option>
                    {deliveryPartnerships.map((partnership) => (
                      <option key={partnership.id} value={partnership.id}>
                        {partnership.provider.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Хүргэгч
                  </span>
                  <select
                    value={selectedCourierId}
                    disabled={!selectedPartnership}
                    onChange={(event) => {
                      setSelectedCourierId(event.target.value);
                      setAssignmentError("");
                    }}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  >
                    <option value="">Хүргэгч сонгох</option>
                    {selectedPartnership?.couriers.map((courier) => (
                      <option key={courier.id} value={courier.id}>
                        {courier.profile?.fullName || courier.email}
                        {courier.profile?.phoneNumber
                          ? ` · ${courier.profile.phoneNumber}`
                          : ""}
                        {courier.deliveryDriverProfile?.vehiclePlateNumber
                          ? ` · ${courier.deliveryDriverProfile.vehiclePlateNumber}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {assignmentError && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
              >
                {assignmentError}
              </p>
            )}
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowDriverForm(false)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Болих
              </button>
              <button
                onClick={() => dispatchWithDriver(selectedDispatch.id)}
                disabled={
                  actionLoading ||
                  assignmentOptionsLoading ||
                  !selectedPartnershipId ||
                  !selectedCourierId
                }
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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

      {/* ───── Invoice Modal ───── */}
      {showInvoice && selectedDispatch && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowInvoice(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <InvoiceView
              dispatch={selectedDispatch}
              onClose={() => setShowInvoice(false)}
            />
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
            <PadaanView
              dispatch={selectedDispatch}
              onClose={() => setShowPadaan(false)}
            />
          </div>
        </div>
      )}

      {/* ───── Return Creation Modal ───── */}
      {showReturnForm && selectedDispatch && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowReturnForm(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500 text-white">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Буцаалт бүртгэх
                  </h2>
                  <p className="text-sm text-slate-500">
                    {selectedDispatch.dispatchNumber} •{" "}
                    {selectedDispatch.request.organization.name}
                  </p>
                </div>
              </div>

              {/* Info grid */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase text-slate-400">
                    Түгээгч
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {selectedDispatch.driverName || "—"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedDispatch.driverPhone || ""}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase text-slate-400">
                    Дэлгүүр / Байгууллага
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {selectedDispatch.request.organization.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedDispatch.request.deliveryAddress || ""}
                  </p>
                </div>
              </div>

              {/* Return reason */}
              <div className="mt-4">
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Буцаалтын ерөнхий шалтгаан
                </label>
                <input
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Гэмтэлтэй бараа, буруу бараа гэх мэт"
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              {/* Items to return */}
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-bold text-slate-700">
                  Буцаах бараа сонгох
                </h3>
                <div className="space-y-2">
                  {returnItems.map((item, idx) => (
                    <div
                      key={item.productId}
                      className="rounded-lg border border-slate-200 bg-white p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-800">
                            {item.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            Хүргэгдсэн: {item.maxQty} ш
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-slate-500">
                            Буцаах:
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={item.maxQty}
                            value={item.quantity || ""}
                            onChange={(e) => {
                              const val = Math.min(
                                Math.max(0, parseInt(e.target.value) || 0),
                                item.maxQty,
                              );
                              setReturnItems((prev) =>
                                prev.map((p, i) =>
                                  i === idx ? { ...p, quantity: val } : p,
                                ),
                              );
                            }}
                            className="h-9 w-20 rounded-lg border border-slate-300 px-2 text-center text-sm outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                      {item.quantity > 0 && (
                        <div className="mt-2">
                          <input
                            value={item.reason}
                            onChange={(e) =>
                              setReturnItems((prev) =>
                                prev.map((p, i) =>
                                  i === idx
                                    ? { ...p, reason: e.target.value }
                                    : p,
                                ),
                              )
                            }
                            placeholder="Шалтгаан (гэмтэл, буруу бараа ...)"
                            className="h-8 w-full rounded border border-slate-200 px-2 text-xs outline-none focus:border-blue-400"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              {returnItems.filter((i) => i.quantity > 0).length > 0 && (
                <div className="mt-3 rounded-lg bg-orange-50 border border-orange-200 p-3">
                  <p className="text-xs font-semibold text-orange-700">
                    Нийт буцаах:{" "}
                    {returnItems.filter((i) => i.quantity > 0).length} бараа,{" "}
                    {returnItems.reduce((s, i) => s + i.quantity, 0)} ширхэг
                  </p>
                </div>
              )}

              {/* Note */}
              <div className="mt-3">
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Тэмдэглэл
                </label>
                <input
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                  placeholder="Нэмэлт тайлбар"
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setShowReturnForm(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Болих
                </button>
                <button
                  onClick={submitReturn}
                  disabled={
                    actionLoading ||
                    returnItems.filter((i) => i.quantity > 0).length === 0
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  Буцаалт үүсгэх
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───── Return Detail Modal ───── */}
      {showReturnDetail && selectedReturn && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowReturnDetail(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-800">
                      {selectedReturn.returnNumber}
                    </h2>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                        selectedReturn.status === "PENDING"
                          ? "bg-amber-50 border-amber-200 text-amber-700"
                          : selectedReturn.status === "APPROVED"
                            ? "bg-green-50 border-green-200 text-green-700"
                            : "bg-red-50 border-red-200 text-red-700"
                      }`}
                    >
                      {selectedReturn.status === "PENDING"
                        ? "Хүлээгдэж буй"
                        : selectedReturn.status === "APPROVED"
                          ? "Батлагдсан"
                          : "Татгалзсан"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Илгээмж: {selectedReturn.dispatch.dispatchNumber} •{" "}
                    {new Date(selectedReturn.createdAt).toLocaleString("mn-MN")}
                  </p>
                </div>
              </div>

              {/* Info grid */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase text-slate-400">
                    Буцаасан дэлгүүр
                  </p>
                  <p className="mt-1 font-medium text-slate-800">
                    {selectedReturn.organization.name}
                  </p>
                  {selectedReturn.organization.phone && (
                    <p className="text-xs text-slate-500">
                      {selectedReturn.organization.phone}
                    </p>
                  )}
                  {selectedReturn.dispatch.request.requestedBy && (
                    <p className="text-xs text-slate-500">
                      {selectedReturn.dispatch.request.requestedBy.profile
                        ?.fullName ||
                        selectedReturn.dispatch.request.requestedBy.email}
                    </p>
                  )}
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase text-slate-400">
                    Агуулах (хүлээн авагч)
                  </p>
                  <p className="mt-1 font-medium text-slate-800">
                    {selectedReturn.warehouse.name}
                  </p>
                </div>
                {selectedReturn.dispatch.driverName && (
                  <div className="rounded-lg bg-purple-50 p-3">
                    <p className="text-[11px] font-semibold uppercase text-purple-400">
                      Түгээгч / Жолооч
                    </p>
                    <p className="mt-1 font-medium text-purple-800">
                      {selectedReturn.dispatch.driverName}
                    </p>
                    <p className="text-xs text-purple-600">
                      {selectedReturn.dispatch.driverPhone}
                      {selectedReturn.dispatch.vehicleNumber &&
                        ` • ${selectedReturn.dispatch.vehicleNumber}`}
                    </p>
                  </div>
                )}
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase text-slate-400">
                    Нийлүүлэгч компани
                  </p>
                  <p className="mt-1 font-medium text-slate-800">
                    {selectedReturn.dispatch.request.organization.name}
                  </p>
                  {selectedReturn.dispatch.request.organization.phone && (
                    <p className="text-xs text-slate-500">
                      {selectedReturn.dispatch.request.organization.phone}
                    </p>
                  )}
                </div>
              </div>

              {selectedReturn.reason && (
                <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  <strong>Шалтгаан:</strong> {selectedReturn.reason}
                </div>
              )}

              {selectedReturn.rejectReason && (
                <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                  <strong>Татгалзсан шалтгаан:</strong>{" "}
                  {selectedReturn.rejectReason}
                </div>
              )}

              {/* Items table */}
              <div className="mt-5">
                <h3 className="mb-3 text-sm font-bold uppercase text-slate-400">
                  Буцаагдсан барааны жагсаалт
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
                        <th className="px-4 py-2.5 text-left font-medium text-slate-600">
                          Шалтгаан
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedReturn.items.map((item, idx) => (
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
                          <td className="px-4 py-2.5 text-right font-bold text-orange-600">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-2.5 text-right text-slate-600">
                            ₮{Number(item.product.price).toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-slate-800">
                            ₮
                            {(
                              item.quantity * Number(item.product.price)
                            ).toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-500">
                            {item.reason || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-3 text-right font-bold text-slate-700"
                        >
                          Нийт:
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-orange-600">
                          {selectedReturn.items.reduce(
                            (s, i) => s + i.quantity,
                            0,
                          )}
                        </td>
                        <td></td>
                        <td className="px-4 py-3 text-right font-bold text-orange-600">
                          ₮
                          {selectedReturn.items
                            .reduce(
                              (s, i) =>
                                s + i.quantity * Number(i.product.price),
                              0,
                            )
                            .toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {selectedReturn.note && (
                <div className="mt-3 text-sm text-slate-600">
                  <strong>Тэмдэглэл:</strong> {selectedReturn.note}
                </div>
              )}

              {selectedReturn.approvedBy && (
                <div className="mt-3 text-xs text-slate-400">
                  {selectedReturn.status === "APPROVED"
                    ? "Баталсан"
                    : "Шийдвэрлэсэн"}
                  :{" "}
                  {selectedReturn.approvedBy.profile?.fullName ||
                    selectedReturn.approvedBy.email}
                  {selectedReturn.approvedAt &&
                    ` • ${new Date(selectedReturn.approvedAt).toLocaleString("mn-MN")}`}
                </div>
              )}

              {/* Actions */}
              {selectedReturn.status === "PENDING" && (
                <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
                  <button
                    onClick={() => approveReturn(selectedReturn.id)}
                    disabled={actionLoading}
                    className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ThumbsUp className="h-4 w-4" />
                    )}
                    Батлах (нөөцөд буцаах)
                  </button>
                  <button
                    onClick={() => rejectReturn(selectedReturn.id)}
                    disabled={actionLoading}
                    className="flex items-center gap-2 rounded-lg border border-red-300 px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <ThumbsDown className="h-4 w-4" />
                    Татгалзах
                  </button>
                </div>
              )}
            </div>
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

/* ════════════════════════════════════════════
   Padaan (Waybill) Print View
   ════════════════════════════════════════════ */
function InvoiceView({
  dispatch: d,
  onClose,
}: {
  dispatch: Dispatch;
  onClose: () => void;
}) {
  const payment = d.request.payment;
  const totalQty = d.request.items.reduce(
    (s, i) => s + (i.approvedQuantity || i.quantity),
    0,
  );
  const computedTotal = d.request.items.reduce(
    (s, i) => s + (i.approvedQuantity || i.quantity) * Number(i.product.price),
    0,
  );
  const invoiceTotal = Number(payment?.totalAmount ?? computedTotal);
  const paidAmount = Number(payment?.paidAmount ?? 0);
  const outstanding = payment ? paymentOutstanding(payment) : invoiceTotal;
  const issuedAt = payment?.createdAt || d.createdAt;

  const handlePrint = () => {
    const printContent = document.getElementById(`invoice-content-${d.id}`);
    if (!printContent) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Нэхэмжлэх - ${payment?.invoiceNumber || d.dispatchNumber}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 30px; font-family: 'Segoe UI', Tahoma, sans-serif; color: #0f172a; }
          .invoice-header { border-bottom: 3px double #334155; padding-bottom: 16px; margin-bottom: 20px; text-align: center; }
          .invoice-header h1 { margin: 0; font-size: 24px; }
          .invoice-header p { margin: 6px 0 0; color: #64748b; font-size: 13px; }
          .invoice-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
          .invoice-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
          .invoice-label { color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .invoice-value { margin-top: 4px; font-size: 14px; font-weight: 700; }
          .invoice-sub { color: #64748b; font-size: 12px; margin-top: 3px; }
          table { width: 100%; border-collapse: collapse; margin-top: 14px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 13px; }
          th { background: #f1f5f9; text-align: left; }
          .text-right { text-align: right; }
          .summary { margin-top: 16px; margin-left: auto; width: 280px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
          .summary-row { display: flex; justify-content: space-between; padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
          .summary-row:last-child { border-bottom: 0; font-weight: 800; background: #f8fafc; }
          .footer { margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 36px; }
          .sig { border-top: 1px solid #94a3b8; padding-top: 8px; text-align: center; color: #64748b; font-size: 12px; }
          @media print { body { padding: 18px; } }
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Нэхэмжлэх</h2>
          <p className="text-sm text-slate-500">
            {payment?.invoiceNumber || "Нэхэмжлэх үүсээгүй"}
          </p>
        </div>
        <div className="flex gap-2">
          {payment && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Printer className="h-4 w-4" />
              Хэвлэх
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Хаах
          </button>
        </div>
      </div>

      {!payment ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
          <AlertTriangle className="mb-3 h-10 w-10 text-amber-400" />
          <p className="font-semibold text-slate-700">
            Энэ илгээмжид нэхэмжлэх үүсээгүй байна
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Захиалга батлагдахад payment invoice үүссэн бол энд харагдана.
          </p>
        </div>
      ) : (
        <div
          id={`invoice-content-${d.id}`}
          className="rounded-lg border border-slate-200 bg-white p-6"
        >
          <div className="invoice-header border-b-2 border-double border-slate-300 pb-4 text-center">
            <h1 className="text-2xl font-bold text-slate-800">НЭХЭМЖЛЭХ</h1>
            <p className="mt-1 text-sm text-slate-500">
              {payment.invoiceNumber} • {d.request.requestNumber} •{" "}
              {new Date(issuedAt).toLocaleDateString("mn-MN")}
            </p>
          </div>

          <div className="invoice-grid mt-5 grid grid-cols-2 gap-4">
            <div className="invoice-box rounded-lg border border-slate-200 p-3">
              <p className="invoice-label text-[11px] font-semibold uppercase text-slate-400">
                Нэхэмжлэгч
              </p>
              <p className="invoice-value mt-1 text-sm font-semibold text-slate-800">
                {d.warehouse.name}
              </p>
              {d.warehouse.address && (
                <p className="invoice-sub text-xs text-slate-500">
                  {d.warehouse.address}
                </p>
              )}
            </div>
            <div className="invoice-box rounded-lg border border-slate-200 p-3">
              <p className="invoice-label text-[11px] font-semibold uppercase text-slate-400">
                Худалдан авагч
              </p>
              <p className="invoice-value mt-1 text-sm font-semibold text-slate-800">
                {d.request.organization.name}
              </p>
              {d.request.deliveryAddress && (
                <p className="invoice-sub text-xs text-slate-500">
                  {d.request.deliveryAddress}
                </p>
              )}
            </div>
            <div className="invoice-box rounded-lg border border-slate-200 p-3">
              <p className="invoice-label text-[11px] font-semibold uppercase text-slate-400">
                Төлөв
              </p>
              <span
                className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${paymentStatusClass(
                  payment.status,
                )}`}
              >
                {paymentStatusLabel(payment.status)}
              </span>
              {payment.paidAt && (
                <p className="invoice-sub text-xs text-slate-500">
                  Төлсөн: {new Date(payment.paidAt).toLocaleString("mn-MN")}
                </p>
              )}
              {payment.dueDate && (
                <p className="invoice-sub text-xs text-slate-500">
                  Төлөх хугацаа:{" "}
                  {new Date(payment.dueDate).toLocaleDateString("mn-MN")}
                </p>
              )}
            </div>
            <div className="invoice-box rounded-lg border border-slate-200 p-3">
              <p className="invoice-label text-[11px] font-semibold uppercase text-slate-400">
                Илгээмж
              </p>
              <p className="invoice-value mt-1 text-sm font-semibold text-slate-800">
                {d.dispatchNumber}
              </p>
              {payment.transactionId && (
                <p className="invoice-sub text-xs text-slate-500">
                  Гүйлгээ: {payment.transactionId}
                </p>
              )}
            </div>
          </div>

          <table className="mt-5 w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-3 py-2 text-left">
                  №
                </th>
                <th className="border border-slate-300 px-3 py-2 text-left">
                  Бүтээгдэхүүн
                </th>
                <th className="border border-slate-300 px-3 py-2 text-left">
                  SKU
                </th>
                <th className="border border-slate-300 px-3 py-2 text-right">
                  Тоо
                </th>
                <th className="border border-slate-300 px-3 py-2 text-right">
                  Нэгж үнэ
                </th>
                <th className="border border-slate-300 px-3 py-2 text-right">
                  Дүн
                </th>
              </tr>
            </thead>
            <tbody>
              {d.request.items.map((item, idx) => {
                const qty = item.approvedQuantity || item.quantity;
                return (
                  <tr key={item.id}>
                    <td className="border border-slate-300 px-3 py-2">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 font-medium">
                      {item.product.name}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-slate-500">
                      {item.product.sku || "-"}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-right font-bold">
                      {qty}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-right">
                      {formatMoney(item.product.price)}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-right font-medium">
                      {formatMoney(qty * Number(item.product.price))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="summary mt-4 ml-auto w-full max-w-xs overflow-hidden rounded-lg border border-slate-200">
            <div className="summary-row flex justify-between border-b border-slate-200 px-3 py-2 text-sm">
              <span>Нийт тоо</span>
              <span className="font-semibold">{totalQty} ш</span>
            </div>
            <div className="summary-row flex justify-between border-b border-slate-200 px-3 py-2 text-sm">
              <span>Нэхэмжилсэн</span>
              <span className="font-semibold">{formatMoney(invoiceTotal)}</span>
            </div>
            <div className="summary-row flex justify-between border-b border-slate-200 px-3 py-2 text-sm">
              <span>Төлсөн</span>
              <span className="font-semibold">{formatMoney(paidAmount)}</span>
            </div>
            <div className="summary-row flex justify-between bg-slate-50 px-3 py-2 text-sm font-bold">
              <span>Үлдэгдэл</span>
              <span>{formatMoney(outstanding)}</span>
            </div>
          </div>

          {payment.note && (
            <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              <strong>Тэмдэглэл:</strong> {payment.note}
            </div>
          )}

          <div className="footer mt-10 grid grid-cols-2 gap-10">
            <div className="sig border-t border-slate-400 pt-2 text-center text-xs text-slate-500">
              Нэхэмжлэх гаргасан
            </div>
            <div className="sig border-t border-slate-400 pt-2 text-center text-xs text-slate-500">
              Хүлээн авсан
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PadaanView({
  dispatch: d,
  onClose,
}: {
  dispatch: Dispatch;
  onClose: () => void;
}) {
  const [padaanReturns, setPadaanReturns] = useState<DispatchReturnType[]>([]);

  useEffect(() => {
    wmsFetch(`/api/operations/stock-requests/dispatches/${d.id}/returns`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data))
          setPadaanReturns(
            data.filter((r: DispatchReturnType) => r.status === "APPROVED"),
          );
      })
      .catch(() => {});
  }, [d.id]);

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
          .returns-section h3 { color: #c2410c; font-size: 14px; font-weight: 700; margin-bottom: 8px; }
          .returns-section .ret-info { font-size: 12px; color: #64748b; margin-bottom: 4px; }
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
        <h2 className="text-lg font-bold text-slate-800">
          Падаан / Зарлагын баримт
        </h2>
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
          <h1 className="text-2xl font-bold text-slate-800">ЗАРЛАГЫН БАРИМТ</h1>
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
              <p className="sub text-xs text-slate-500">
                {d.warehouse.address}
              </p>
            )}
            {d.warehouse.phone && (
              <p className="sub text-xs text-slate-500">
                Утас: {d.warehouse.phone}
              </p>
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
              <p className="sub text-xs text-slate-500">
                {d.request.deliveryAddress}
              </p>
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
              <p className="sub text-xs text-slate-500">
                Утас: {d.driverPhone}
              </p>
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
              <th className="border border-slate-300 px-3 py-2 text-left">
                SKU
              </th>
              <th className="border border-slate-300 px-3 py-2 text-right">
                Тоо ширхэг
              </th>
              <th className="border border-slate-300 px-3 py-2 text-right">
                Нэгж үнэ
              </th>
              <th className="border border-slate-300 px-3 py-2 text-right">
                Нийт дүн
              </th>
            </tr>
          </thead>
          <tbody>
            {d.request.items.map((item, idx) => {
              const qty = item.approvedQuantity || item.quantity;
              return (
                <tr key={item.id}>
                  <td className="border border-slate-300 px-3 py-2">
                    {idx + 1}
                  </td>
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
              <td
                colSpan={3}
                className="border border-slate-300 px-3 py-2 text-right"
              >
                Нийт:
              </td>
              <td className="border border-slate-300 px-3 py-2 text-right">
                {totalQty}
              </td>
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

        {/* Returns */}
        {padaanReturns.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-bold text-orange-700">
              БУЦААГДСАН БАРАА
            </h3>
            {padaanReturns.map((ret) => (
              <div key={ret.id} className="mb-3">
                <p className="text-xs text-slate-500">
                  {ret.returnNumber} •{" "}
                  {new Date(ret.approvedAt || ret.createdAt).toLocaleDateString(
                    "mn-MN",
                  )}
                  {ret.reason && ` • Шалтгаан: ${ret.reason}`}
                </p>
                <table className="mt-1 w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-orange-50">
                      <th className="border border-slate-300 px-3 py-1 text-left">
                        Бүтээгдэхүүн
                      </th>
                      <th className="border border-slate-300 px-3 py-1 text-right">
                        Тоо
                      </th>
                      <th className="border border-slate-300 px-3 py-1 text-left">
                        Шалтгаан
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ret.items.map((item) => (
                      <tr key={item.id}>
                        <td className="border border-slate-300 px-3 py-1">
                          {item.product.name}
                        </td>
                        <td className="border border-slate-300 px-3 py-1 text-right font-bold">
                          {item.quantity}
                        </td>
                        <td className="border border-slate-300 px-3 py-1 text-slate-500">
                          {item.reason || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
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
