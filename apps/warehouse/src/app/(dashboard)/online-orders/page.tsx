"use client";

import { useState } from "react";
import {
  Inbox,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  DeliveryPackageDialog,
  type DeliveryPackageDetails,
} from "@mgl/ui";
import {
  DeliveryAssignmentDialog,
  OnlineOrderCard,
  OnlineOrderStats,
  OrderActionDialog,
  type OnlineOrder,
  type OnlineOrderStatus,
  useOnlineOrders,
  useDeliveryAssignment,
} from "@/features/online-orders";

const FILTERS: Array<{
  value: OnlineOrderStatus | "";
  label: string;
}> = [
  { value: "", label: "Идэвхтэй бүгд" },
  { value: "CONFIRMED", label: "Шинэ" },
  { value: "PREPARING", label: "Бэлтгэж байна" },
  { value: "PREPARED", label: "Бэлтгэгдсэн" },
  { value: "SHIPPING", label: "Хүргэлтэд" },
  { value: "COMPLETED", label: "Дууссан" },
];

export default function OnlineOrdersPage() {
  const [status, setStatus] = useState<OnlineOrderStatus | "">("");
  const [search, setSearch] = useState("");
  const [confirmOrder, setConfirmOrder] = useState<OnlineOrder | null>(null);
  const [packageOrder, setPackageOrder] = useState<OnlineOrder | null>(null);
  const [assignmentOrder, setAssignmentOrder] = useState<OnlineOrder | null>(
    null,
  );
  const { orders, loading, actionOrderId, error, refresh, advance } =
    useOnlineOrders(status, search);
  const deliveryAssignment = useDeliveryAssignment(refresh);

  const requestAdvance = (order: OnlineOrder) => {
    if (order.status === "PREPARED") {
      setPackageOrder(order);
      return;
    }
    setConfirmOrder(order);
  };

  const confirmAdvance = async () => {
    if (!confirmOrder) return;
    try {
      await advance(confirmOrder.id);
      setConfirmOrder(null);
    } catch {
      // The hook exposes the request error in the page alert.
    }
  };

  const submitPackage = async (details: DeliveryPackageDetails) => {
    if (!packageOrder) return;
    const orderToAssign = packageOrder;
    try {
      await advance(orderToAssign.id, details);
      setPackageOrder(null);
      deliveryAssignment.setError("");
      setAssignmentOrder(orderToAssign);
    } catch {
      // Keep the dialog open so the operator can retry.
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <header className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <h1 className="shrink-0 text-xl font-black tracking-tight text-slate-950">
            Онлайн захиалга
          </h1>
          <OnlineOrderStats orders={orders} />
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          aria-label="Захиалгын жагсаалт шинэчлэх"
          title="Шинэчлэх"
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          <span className="sm:hidden">Шинэчлэх</span>
        </button>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row">
          <label className="relative min-w-0 flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <span className="sr-only">Захиалга хайх</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Захиалгын дугаар, утас эсвэл бараагаар хайх..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </label>
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1 xl:pb-0">
            {FILTERS.map((filter) => (
              <button
                key={filter.value || "all"}
                type="button"
                onClick={() => setStatus(filter.value)}
                  className={`shrink-0 rounded-lg px-3 py-2.5 text-xs font-bold transition ${
                  status === filter.value
                    ? "bg-slate-950 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <Loader2 size={30} className="animate-spin text-blue-600" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <div className="rounded-2xl bg-slate-100 p-4 text-slate-400">
            <Inbox size={30} />
          </div>
          <h2 className="mt-4 text-lg font-black text-slate-900">
            Захиалга олдсонгүй
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            Сонгосон төлөв эсвэл хайлтад тохирох, төлбөр баталгаажсан онлайн
            захиалга одоогоор алга.
          </p>
        </div>
      ) : (
        <section className="space-y-4">
          {orders.map((order) => (
            <OnlineOrderCard
              key={order.id}
              order={order}
              busy={actionOrderId === order.id}
              onAdvance={requestAdvance}
              onAssignDelivery={setAssignmentOrder}
            />
          ))}
        </section>
      )}

      {confirmOrder && (
        <OrderActionDialog
          order={confirmOrder}
          busy={actionOrderId === confirmOrder.id}
          onCancel={() => setConfirmOrder(null)}
          onConfirm={() => void confirmAdvance()}
        />
      )}
      {packageOrder && (
        <DeliveryPackageDialog
          orderNumber={packageOrder.orderNumber}
          submitting={actionOrderId === packageOrder.id}
          onClose={() => setPackageOrder(null)}
          onSubmit={submitPackage}
        />
      )}
      {assignmentOrder && (
        <DeliveryAssignmentDialog
          order={assignmentOrder}
          partnerships={deliveryAssignment.partnerships}
          loading={deliveryAssignment.loading}
          submitting={deliveryAssignment.assigning}
          error={deliveryAssignment.error}
          onClose={() => {
            deliveryAssignment.setError("");
            setAssignmentOrder(null);
          }}
          onSubmit={async (partnershipId, courierId) => {
            try {
              await deliveryAssignment.assign(
                assignmentOrder.id,
                partnershipId,
                courierId,
              );
              setAssignmentOrder(null);
            } catch {
              // Keep the dialog open and show the hook error for retry.
            }
          }}
        />
      )}
    </div>
  );
}
