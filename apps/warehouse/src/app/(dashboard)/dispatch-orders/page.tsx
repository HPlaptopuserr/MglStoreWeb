"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  User,
  Phone,
  MapPin,
  FileText,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  CalendarDays,
  History,
} from "lucide-react";
import { API, wmsFetch } from "@/lib/api";
import { DeliveryPackageDialog, type DeliveryPackageDetails } from "@mgl/ui";
import { fetchDeliveryAssignmentOptions } from "@/features/online-orders/online-order.api";
import type { DeliveryAssignmentPartnership } from "@/features/online-orders/online-order.types";
import { WarehouseStockRequestQueue } from "@/features/dispatch/WarehouseStockRequestQueue";

import {
  type Dispatch,
  type DispatchReturnType,
  type WarehouseOption,
  STATUS_MAP,
  STEPS,
  formatMoney,
  paymentOutstanding,
  paymentStatusClass,
  paymentStatusLabel,
  stepIndex,
} from "@/features/dispatch-orders/dispatch-order.model";
import {
  InvoiceView,
  PadaanView,
} from "@/features/dispatch-orders/DispatchPrintViews";
import { DispatchDetail } from "@/features/dispatch-orders/DispatchDetail";

const formatDateInput = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

export default function DispatchOrdersPage() {
  const today = formatDateInput(new Date());
  const sevenDaysAgo = formatDateInput(new Date(Date.now() - 6 * 86_400_000));
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [boardView, setBoardView] = useState<"today" | "history">("today");
  const [historyFrom, setHistoryFrom] = useState(sevenDaysAgo);
  const [historyTo, setHistoryTo] = useState(today);
  const [warehouseLoadError, setWarehouseLoadError] = useState<string | null>(
    null,
  );

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
  const [showCancelledList, setShowCancelledList] = useState(false);
  const [cancelledDispatches, setCancelledDispatches] = useState<Dispatch[]>(
    [],
  );
  const [cancelledLoading, setCancelledLoading] = useState(false);
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
    setWarehouseLoadError(null);
    wmsFetch(`${API}/warehouses`)
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            body?.message || "Агуулахын мэдээлэл авахад алдаа гарлаа",
          );
        }
        return body;
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : data.warehouses || [];
        setWarehouses(list);
        if (list.length > 0) setSelectedWarehouseId(list[0].id);
      })
      .catch((error: unknown) => {
        setWarehouseLoadError(
          error instanceof Error
            ? error.message
            : "Агуулахын мэдээлэл авахад алдаа гарлаа",
        );
      });
  }, []);

  const fetchDispatches = useCallback(
    async (silent = false) => {
      if (!selectedWarehouseId) return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        setLoadError(null);
        const params = new URLSearchParams({ view: boardView });
        const rangeStart = new Date(
          `${boardView === "history" ? historyFrom : today}T00:00:00`,
        );
        const rangeEnd = new Date(
          `${boardView === "history" ? historyTo : today}T00:00:00`,
        );
        rangeEnd.setDate(rangeEnd.getDate() + 1);
        params.set("from", rangeStart.toISOString());
        params.set("to", rangeEnd.toISOString());
        const response = await wmsFetch(
          `${API}/stock-requests/warehouse/${selectedWarehouseId}/dispatches?${params}`,
        );
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            body?.message || "Илгээмжийн захиалга авахад алдаа гарлаа",
          );
        }
        setDispatches(Array.isArray(body) ? body : []);
        setLastUpdatedAt(new Date());
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Илгээмжийн захиалга авахад алдаа гарлаа",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [boardView, historyFrom, historyTo, selectedWarehouseId],
  );

  // Keep the warehouse queue live while admin approves new requests.
  useEffect(() => {
    if (!selectedWarehouseId) return;
    void fetchDispatches();
    const interval =
      boardView === "today"
        ? window.setInterval(() => void fetchDispatches(true), 15_000)
        : undefined;
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") void fetchDispatches(true);
    };
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => {
      if (interval) window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [boardView, fetchDispatches, selectedWarehouseId]);

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
    const reason = window.prompt("Илгээмж цуцлах шалтгааныг оруулна уу");
    if (reason === null) return;
    if (!reason.trim()) {
      alert("Цуцлах шалтгаан заавал оруулна");
      return;
    }
    setActionLoading(true);
    try {
      const res = await wmsFetch(
        `${API}/stock-requests/dispatches/${id}/cancel`,
        {
          method: "PATCH",
          body: JSON.stringify({ note: reason.trim() }),
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

  const openCancelledList = async () => {
    if (!selectedWarehouseId) return;
    setShowCancelledList(true);
    setCancelledLoading(true);
    try {
      const response = await wmsFetch(
        `${API}/stock-requests/warehouse/${selectedWarehouseId}/dispatches?view=cancelled`,
      );
      const body = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(
          body?.message || "Цуцлагдсан хүсэлт авахад алдаа гарлаа",
        );
      }
      setCancelledDispatches(Array.isArray(body) ? body : []);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Цуцлагдсан хүсэлт авахад алдаа гарлаа",
      );
    } finally {
      setCancelledLoading(false);
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

  const refreshSelectedDispatch = async () => {
    if (!selectedDispatch) return;
    const response = await wmsFetch(
      `${API}/stock-requests/dispatches/${selectedDispatch.id}`,
    );
    if (response.ok) setSelectedDispatch(await response.json());
    await fetchDispatches(true);
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

  const isOverduePending = (dispatch: Dispatch) =>
    dispatch.status === "PENDING" &&
    Date.now() - new Date(dispatch.createdAt).getTime() >= 86_400_000;

  const pendingAgeLabel = (dispatch: Dispatch) => {
    const hours = Math.floor(
      (Date.now() - new Date(dispatch.createdAt).getTime()) / 3_600_000,
    );
    const days = Math.floor(hours / 24);
    return days > 0 ? `${days} хоног хүлээгдсэн` : `${hours} цаг хүлээгдсэн`;
  };

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
          <div className="hidden text-right sm:block">
            <p className="text-xs font-medium text-slate-500">
              15 секунд тутам шинэчилнэ
            </p>
            {lastUpdatedAt && (
              <p className="text-[11px] text-slate-400">
                Сүүлд: {lastUpdatedAt.toLocaleTimeString("mn-MN")}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void fetchDispatches(true)}
            disabled={!selectedWarehouseId || refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Шинэчлэх
          </button>
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

      {(warehouseLoadError || loadError) && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">
                Захиалгын мэдээлэл шинэчлэгдсэнгүй
              </p>
              <p className="mt-0.5 text-xs text-red-600">
                {warehouseLoadError || loadError}
              </p>
            </div>
          </div>
          {selectedWarehouseId && (
            <button
              type="button"
              onClick={() => void fetchDispatches(true)}
              className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-bold shadow-sm"
            >
              Дахин оролдох
            </button>
          )}
        </div>
      )}

      {selectedWarehouseId && (
        <WarehouseStockRequestQueue
          warehouseId={selectedWarehouseId}
          onDecision={() => void fetchDispatches(true)}
        />
      )}

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

      {activeTab === "dispatches" && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setBoardView("today")}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                boardView === "today"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <CalendarDays className="h-4 w-4" /> Өнөөдөр
            </button>
            <button
              type="button"
              onClick={() => setBoardView("history")}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                boardView === "history"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <History className="h-4 w-4" /> Түүх
            </button>
          </div>
          {boardView === "history" ? (
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
              <label htmlFor="history-from">Эхлэх</label>
              <input
                id="history-from"
                type="date"
                value={historyFrom}
                max={historyTo}
                onChange={(event) => setHistoryFrom(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <label htmlFor="history-to">Дуусах</label>
              <input
                id="history-to"
                type="date"
                value={historyTo}
                min={historyFrom}
                max={today}
                onChange={(event) => setHistoryTo(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Хүлээгдэж буй бүх ажил, бусад төлөвийн зөвхөн өнөөдрийн мэдээлэл
            </p>
          )}
        </div>
      )}

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

            <button
              type="button"
              onClick={() => void openCancelledList()}
              className="flex w-full items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-left text-sm text-red-700 transition hover:border-red-300 hover:bg-red-100"
            >
              <XCircle className="h-4 w-4" />
              <span className="font-semibold">Цуцлагдсан хүсэлтүүд</span>
              <span className="ml-auto text-xs font-bold">Түүх харах</span>
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* 4-column pipeline board */}
            <div className="grid grid-cols-4 gap-4 items-start">
              {STEPS.map((step, colIdx) => {
                const colDispatches = dispatches
                  .filter((d) => d.status === step.key)
                  .sort((a, b) => {
                    if (step.key !== "PENDING") {
                      return (
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime()
                      );
                    }
                    const overdueDifference =
                      Number(isOverduePending(b)) - Number(isOverduePending(a));
                    if (overdueDifference !== 0) return overdueDifference;
                    return (
                      new Date(a.createdAt).getTime() -
                      new Date(b.createdAt).getTime()
                    );
                  });
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
                    <div className="min-h-[120px] max-h-[68vh] space-y-2.5 overflow-y-auto overscroll-contain pr-1">
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
                            className={`cursor-pointer rounded-xl border bg-white p-3.5 shadow-sm transition-all hover:shadow-md ${
                              isOverduePending(d)
                                ? "border-red-400 ring-1 ring-red-100 hover:border-red-500"
                                : "border-slate-200 hover:border-blue-300"
                            }`}
                          >
                            {isOverduePending(d) && (
                              <div className="mb-2 flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700">
                                <AlertTriangle className="h-3 w-3" />
                                {pendingAgeLabel(d)}
                              </div>
                            )}
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

      {/* ───── Cancelled requests history ───── */}
      {showCancelledList && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowCancelledList(false)}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Цуцлагдсан хүсэлтүүд
                  </h2>
                  <p className="text-xs text-slate-500">
                    Шийдвэр гаргасан ажилтан болон бүрэн audit мэдээлэл
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelledList(false)}
                aria-label="Цуцлагдсан хүсэлтийн түүх хаах"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              {cancelledLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-7 w-7 animate-spin text-red-500" />
                </div>
              ) : cancelledDispatches.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
                  <Package className="mx-auto mb-2 h-9 w-9 text-slate-300" />
                  <p className="text-sm font-medium text-slate-500">
                    Цуцлагдсан хүсэлт алга
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cancelledDispatches.map((dispatch) => {
                    const decision = dispatch.cancellationDecision;
                    const actorName =
                      decision?.user?.profile?.fullName ||
                      decision?.user?.email ||
                      decision?.meta?.actorEmail;
                    return (
                      <article
                        key={dispatch.id}
                        className="rounded-xl border border-red-100 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-slate-900">
                                {dispatch.dispatchNumber}
                              </span>
                              <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700">
                                Цуцлагдсан
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-slate-600">
                              {dispatch.request.organization.name} ·{" "}
                              {dispatch.request.requestNumber} ·{" "}
                              {totalItems(dispatch)} ш · ₮
                              {totalAmount(dispatch).toLocaleString()}
                            </p>
                            <p className="mt-2 text-sm font-medium text-red-700">
                              Шалтгаан:{" "}
                              {decision?.meta?.reason ||
                                dispatch.note ||
                                "Тодорхойгүй"}
                            </p>
                          </div>
                          <div className="grid shrink-0 gap-1 text-xs text-slate-500 lg:min-w-72">
                            <p>
                              <b className="text-slate-700">Шийдвэрлэсэн:</b>{" "}
                              {actorName || "Хуучин бүртгэл — мэдээлэлгүй"}
                            </p>
                            <p>
                              <b className="text-slate-700">Эрх:</b>{" "}
                              {decision?.meta?.actorRole || "—"}
                              {decision?.meta?.actorOrgRole
                                ? ` / ${decision.meta.actorOrgRole}`
                                : ""}
                            </p>
                            <p>
                              <b className="text-slate-700">Огноо:</b>{" "}
                              {new Date(
                                decision?.createdAt ||
                                  dispatch.updatedAt ||
                                  dispatch.createdAt,
                              ).toLocaleString("mn-MN")}
                            </p>
                            {decision?.ip && (
                              <p>
                                <b className="text-slate-700">IP:</b>{" "}
                                {decision.ip}
                              </p>
                            )}
                            {decision?.userAgent && (
                              <p
                                className="truncate"
                                title={decision.userAgent}
                              >
                                <b className="text-slate-700">Төхөөрөмж:</b>{" "}
                                {decision.userAgent}
                              </p>
                            )}
                            <p>
                              <b className="text-slate-700">Өмнөх төлөв:</b>{" "}
                              {decision?.meta?.previousStatus || "—"}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                          {dispatch.request.items.slice(0, 4).map((item) => (
                            <span
                              key={item.id}
                              className="rounded-md bg-slate-50 px-2 py-1 text-[11px] text-slate-600"
                            >
                              {item.product.name} ×{" "}
                              {item.approvedQuantity || item.quantity}
                            </span>
                          ))}
                          {dispatch.request.items.length > 4 && (
                            <span className="text-xs text-slate-400">
                              +{dispatch.request.items.length - 4}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setShowCancelledList(false);
                              openDetail(dispatch);
                            }}
                            className="ml-auto rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-blue-300 hover:text-blue-700"
                          >
                            Дэлгэрэнгүй
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
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
              onItemsUpdated={refreshSelectedDispatch}
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
          onSubmit={(details) => confirmDispatch(selectedDispatch.id, details)}
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
