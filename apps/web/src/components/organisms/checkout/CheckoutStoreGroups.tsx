"use client";

import {
  Building2,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
} from "lucide-react";

export interface CheckoutStoreItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface CheckoutStoreGroup {
  organizationId: string;
  organizationName: string;
  items: CheckoutStoreItem[];
  total: number;
  paymentConfigured?: boolean;
  orderId?: string;
  orderNumber?: string;
  canPay?: boolean;
  paid?: boolean;
  preorderOrder?: boolean;
  dispatchStatus?: string;
}

function paymentStatusLabel(group: CheckoutStoreGroup) {
  if (group.paid) return "Төлөгдсөн";
  if (group.orderId) return "Төлөхөд бэлэн";
  if (group.dispatchStatus === "NO_BRANCH_AVAILABLE")
    return "Салбар шалгаж байна";
  if (group.dispatchStatus === "MANUAL_REVIEW")
    return "Хүргэлт баталгаажуулж байна";
  return "Хүлээгдэж байна";
}

export function CheckoutStoreGroups({
  groups,
  paymentPhase,
  loadingOrderId,
  onPay,
}: {
  groups: CheckoutStoreGroup[];
  paymentPhase: boolean;
  loadingOrderId?: string | null;
  onPay?: (group: CheckoutStoreGroup) => void;
}) {
  if (groups.length === 0) return null;
  const isMultiStore = groups.length > 1;

  return (
    <section
      className="space-y-3"
      aria-labelledby="checkout-store-groups-title"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="checkout-store-groups-title"
          className="text-sm font-black text-slate-900"
        >
          {paymentPhase
            ? "Дэлгүүр тус бүрийн төлбөр"
            : "Дэлгүүрээр ангилсан сагс"}
        </h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
          {groups.length} байгууллага
        </span>
      </div>

      {isMultiStore && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-5 text-amber-800">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            Бараанууд өөр байгууллагынх тул төлбөрийг дэлгүүр бүрээр тусдаа
            QR-аар төлнө. QR бүр 10 минут хүчинтэй бөгөөд тухайн дэлгүүрийн
            бүртгэлтэй дансанд шууд орно.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {groups.map((group, index) => {
          const paymentUnavailable = group.paymentConfigured === false;
          const paying = loadingOrderId === group.orderId;
          const paymentReady = Boolean(group.orderId) && !group.paid;
          return (
            <article
              key={group.orderId || group.organizationId}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-slate-600 shadow-sm">
                  <Building2 size={17} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black text-slate-900">
                    {index + 1}. {group.organizationName}
                  </p>
                  {group.orderNumber && (
                    <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                      Захиалга: {group.orderNumber}
                    </p>
                  )}
                </div>
                {paymentPhase && (
                  <span
                    className={`text-[10px] font-black ${
                      group.paid
                        ? "text-emerald-600"
                        : paymentReady
                          ? "text-blue-600"
                          : "text-amber-600"
                    }`}
                  >
                    {paymentStatusLabel(group)}
                  </span>
                )}
              </div>

              <div className="space-y-2 px-4 py-3">
                {group.items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-700">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {item.quantity} × ₮{item.price.toLocaleString()}
                      </p>
                    </div>
                    <span className="shrink-0 font-black tabular-nums text-slate-800">
                      ₮{item.subtotal.toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-sm font-black text-slate-950">
                  <span>Дэлгүүрийн нийт</span>
                  <span className="tabular-nums">
                    ₮{group.total.toLocaleString()}
                  </span>
                </div>

                {paymentUnavailable && !paymentPhase && (
                  <p className="rounded-xl bg-red-50 px-3 py-2 text-[11px] font-bold text-red-600">
                    Энэ дэлгүүр төлбөр хүлээн авах QR дансаа холбоогүй байна.
                  </p>
                )}

                {paymentPhase && !group.paid && (
                  <button
                    type="button"
                    onClick={() => onPay?.(group)}
                    disabled={!paymentReady || paying}
                    className="mt-1 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                  >
                    {paying ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <CreditCard size={16} />
                    )}
                    {paymentReady
                      ? "Энэ дэлгүүрийн төлбөрийг төлөх"
                      : "Төлбөр хүлээгдэж байна"}
                  </button>
                )}

                {group.paid && (
                  <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-black text-emerald-700">
                    <CheckCircle2 size={16} /> Төлбөр амжилттай
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
