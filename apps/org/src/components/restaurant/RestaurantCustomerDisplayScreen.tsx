"use client";

import { useEffect, useMemo, useState } from "react";
import { QrGenerator } from "@mgl/ui";
import {
  CheckCircle2,
  Clock3,
  Monitor,
  QrCode,
  ReceiptText,
  UtensilsCrossed,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  RESTAURANT_CUSTOMER_DISPLAY_CHANNEL,
  RESTAURANT_CUSTOMER_DISPLAY_STORAGE_KEY,
  type RestaurantCustomerDisplayOrderMode,
  type RestaurantCustomerDisplayPaymentMethod,
  type RestaurantCustomerDisplayPayload,
} from "./customer-display";

const moneyFormatter = new Intl.NumberFormat("mn-MN");
const formatMoney = (value: number) =>
  `${moneyFormatter.format(Math.round(Number(value) || 0))}₮`;

const orderModeCopy: Record<RestaurantCustomerDisplayOrderMode, string> = {
  DINE_IN: "Зааланд",
  TO_GO: "Авч явах",
  DELIVERY: "Хүргэлт",
};

const paymentMethodCopy: Record<
  RestaurantCustomerDisplayPaymentMethod,
  string
> = {
  CASH: "Бэлэн",
  CARD: "Карт",
  QPAY: "QPay",
  CREDIT: "Зээл",
};

const EMPTY_PAYLOAD: RestaurantCustomerDisplayPayload = {
  organizationName: "MGL Store Restaurant",
  branchName: "Салбар сонгогдоогүй",
  registerName: "Касс",
  tableLabel: "-",
  orderMode: "DINE_IN",
  paymentMethod: "CASH",
  lines: [],
  totals: {
    subtotal: 0,
    discount: 0,
    total: 0,
  },
  qpay: null,
  message: "",
  success: null,
  updatedAt: 0,
};

function isCustomerPayload(
  value: unknown,
): value is RestaurantCustomerDisplayPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RestaurantCustomerDisplayPayload>;
  return Array.isArray(candidate.lines) && Boolean(candidate.totals);
}

function parseCustomerPayload(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return isCustomerPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function qpayStatusCopy(status: RestaurantCustomerDisplayPayload["qpay"]) {
  if (!status) return "";
  if (status.status === "PAID") return "Төлөгдсөн";
  if (status.status === "EXPIRED") return "Хугацаа дууссан";
  return "Төлбөр хүлээгдэж байна";
}

function paymentMethodLabel(method?: string | null) {
  const normalized = String(method || "").toUpperCase();
  if (normalized === "QPAY" || normalized === "QR") return "QPay";
  if (normalized === "CARD") return "Карт";
  if (normalized === "CREDIT") return "Зээл";
  return "Бэлэн";
}

export function RestaurantCustomerDisplayScreen() {
  const [payload, setPayload] =
    useState<RestaurantCustomerDisplayPayload>(EMPTY_PAYLOAD);
  const [hasPayload, setHasPayload] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const applyPayload = (next: RestaurantCustomerDisplayPayload) => {
      setPayload(next);
      setHasPayload(true);
    };

    const initialSyncTimer = window.setTimeout(() => {
      const stored = parseCustomerPayload(
        window.localStorage.getItem(RESTAURANT_CUSTOMER_DISPLAY_STORAGE_KEY),
      );
      if (stored) {
        applyPayload(stored);
      }
    }, 0);

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== RESTAURANT_CUSTOMER_DISPLAY_STORAGE_KEY) return;
      const next = parseCustomerPayload(event.newValue);
      if (!next) return;
      applyPayload(next);
    };
    window.addEventListener("storage", handleStorage);

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(RESTAURANT_CUSTOMER_DISPLAY_CHANNEL);
      channel.onmessage = (
        event: MessageEvent<RestaurantCustomerDisplayPayload>,
      ) => {
        if (!isCustomerPayload(event.data)) return;
        applyPayload(event.data);
      };
    }

    return () => {
      window.clearTimeout(initialSyncTimer);
      window.removeEventListener("storage", handleStorage);
      channel?.close();
    };
  }, []);

  const activeSuccess = useMemo(() => {
    if (!payload.success || now <= 0) return null;
    return now - payload.success.ts <= 10_000 ? payload.success : null;
  }, [now, payload.success]);

  const qpayQrSrc = payload.qpay?.qrImage
    ? `data:image/png;base64,${payload.qpay.qrImage}`
    : null;
  const visibleDeepLinks = payload.qpay?.deepLinks?.slice(0, 6) ?? [];

  return (
    <section className="relative h-screen overflow-hidden bg-[#080b16] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.2),transparent_32%)]" />
      <div className="relative grid h-full min-h-0 grid-cols-[minmax(0,1fr)_410px] gap-4 p-4 max-lg:grid-cols-1 max-lg:overflow-y-auto">
        <main className="flex min-h-0 flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-slate-950/40 backdrop-blur">
          <header className="flex shrink-0 items-start justify-between gap-5 border-b border-white/10 pb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-400 text-slate-950">
                  <UtensilsCrossed className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-200">
                    Захиалгын дэлгэц
                  </p>
                  <h1 className="truncate text-3xl font-black tracking-tight">
                    {payload.organizationName}
                  </h1>
                </div>
              </div>
              <p className="mt-3 text-base font-semibold text-white/60">
                {payload.branchName} · {payload.registerName}
              </p>
            </div>

            <div className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-right">
              <div className="flex items-center justify-end gap-2 text-xs font-black uppercase tracking-[0.2em] text-white/45">
                {hasPayload ? (
                  <Wifi className="h-4 w-4 text-emerald-300" />
                ) : (
                  <WifiOff className="h-4 w-4 text-rose-300" />
                )}
                {hasPayload ? "Live" : "Хүлээж байна"}
              </div>
              <p className="mt-2 text-2xl font-black">
                Ширээ {payload.tableLabel}
              </p>
              <p className="text-sm font-semibold text-white/55">
                {orderModeCopy[payload.orderMode]}
              </p>
            </div>
          </header>

          <div className="mt-5 flex min-h-0 flex-1 flex-col">
            {payload.lines.length === 0 ? (
              <div className="grid flex-1 place-items-center rounded-[1.5rem] border border-dashed border-white/15 bg-white/[0.03] p-10 text-center">
                <div>
                  <Monitor className="mx-auto h-16 w-16 text-white/30" />
                  <h2 className="mt-5 text-3xl font-black">
                    Захиалга хүлээгдэж байна
                  </h2>
                  <p className="mt-3 max-w-lg text-lg font-semibold leading-8 text-white/50">
                    Касс дээр хоол нэмэхэд энэ дэлгэц дээр захиалга болон нийт
                    төлөх дүн автоматаар гарна.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.25rem] border border-white/10">
                <div className="grid shrink-0 grid-cols-[1fr_86px_150px] gap-4 border-b border-white/10 bg-white/[0.08] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white/45">
                  <span>Хоол</span>
                  <span className="text-center">Тоо</span>
                  <span className="text-right">Дүн</span>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {payload.lines.map((line) => (
                    <div
                      key={line.id}
                      className="grid grid-cols-[1fr_86px_150px] gap-4 border-b border-white/10 px-5 py-4 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xl font-black">
                          {line.name}
                        </p>
                        <p className="mt-1 text-base font-semibold text-white/45">
                          {formatMoney(line.unitPrice)}
                          {line.sentQty > 0
                            ? ` · Гал тогоонд ${line.sentQty}`
                            : ""}
                        </p>
                        {line.note ? (
                          <p className="mt-2 rounded-xl bg-amber-300/10 px-3 py-2 text-sm font-bold text-amber-100">
                            {line.note}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-center">
                        <span className="rounded-2xl bg-white px-4 py-2 text-2xl font-black text-slate-950">
                          ×{line.qty}
                        </span>
                      </div>
                      <div className="flex items-center justify-end text-2xl font-black text-emerald-200">
                        {formatMoney(line.lineTotal)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>

        <aside className="flex min-h-0 flex-col gap-4 overflow-hidden">
          <div className="shrink-0 rounded-[1.5rem] border border-white/10 bg-white p-5 text-slate-950 shadow-2xl shadow-slate-950/30">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
              Төлөх дүн
            </p>
            <p className="mt-2 break-words text-5xl font-black tracking-tight">
              {formatMoney(payload.totals.total)}
            </p>

            <div className="mt-5 space-y-2 text-sm font-bold">
              <div className="flex justify-between gap-4 text-slate-500">
                <span>Дэд дүн</span>
                <span>{formatMoney(payload.totals.subtotal)}</span>
              </div>
              {payload.totals.discount > 0 ? (
                <div className="flex justify-between gap-4 text-rose-500">
                  <span>Хөнгөлөлт</span>
                  <span>-{formatMoney(payload.totals.discount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 text-lg text-slate-950">
                <span>Нийт</span>
                <span>{formatMoney(payload.totals.total)}</span>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-100 p-3">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                Төлбөрийн хэлбэр
              </p>
              <p className="mt-1 text-xl font-black">
                {paymentMethodCopy[payload.paymentMethod]}
              </p>
            </div>
          </div>

          {payload.qpay ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-sky-300/20 bg-slate-950/80 p-4 shadow-2xl shadow-slate-950/30">
              <div className="flex shrink-0 items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300">
                    QPay
                  </p>
                  <h2 className="mt-1 text-3xl font-black">Төлбөр</h2>
                </div>
                <span
                  className={`rounded-full px-4 py-2 text-xs font-black ${
                    payload.qpay.status === "PAID"
                      ? "bg-emerald-300 text-slate-950"
                      : payload.qpay.status === "EXPIRED"
                        ? "bg-rose-300 text-slate-950"
                        : "bg-sky-300 text-slate-950"
                  }`}
                >
                  {qpayStatusCopy(payload.qpay)}
                </span>
              </div>

              <div className="mt-3 shrink-0 rounded-3xl bg-white p-3">
                <div className="grid h-[240px] place-items-center rounded-2xl border border-slate-100">
                  {qpayQrSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element -- QPay returns a short-lived base64 QR image; next/image optimization is not useful here.
                    <img
                      src={qpayQrSrc}
                      alt="QPay QR"
                      className="h-56 w-56 object-contain"
                    />
                  ) : payload.qpay.qrText ? (
                    <QrGenerator value={payload.qpay.qrText} size={220} />
                  ) : (
                    <QrCode className="h-16 w-16 text-slate-300" />
                  )}
                </div>
              </div>

              <div className="mt-3 shrink-0 rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-white/40">
                  <Clock3 className="h-4 w-4" />
                  Төлөх дүн
                </div>
                <p className="mt-1 text-3xl font-black text-sky-200">
                  {formatMoney(payload.qpay.amount)}
                </p>
                <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-white/55">
                  {payload.message || "Банкны апп-аар QR уншуулж төлнө үү."}
                </p>
              </div>

              {visibleDeepLinks.length > 0 ? (
                <div className="mt-3 grid max-h-24 shrink-0 grid-cols-2 gap-2 overflow-y-auto">
                  {visibleDeepLinks.map((link, index) => (
                    <div
                      key={`${link.link}-${index}`}
                      className="truncate rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-center text-xs font-black text-white/75"
                    >
                      {link.name || link.description || "Банк апп"}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-1 flex-col justify-between rounded-[2rem] border border-white/10 bg-white/[0.06] p-7 text-white/70 shadow-2xl shadow-slate-950/30">
              <div>
                <ReceiptText className="h-12 w-12 text-white/30" />
                <h2 className="mt-4 text-3xl font-black text-white">
                  Төлбөр эхлээгүй
                </h2>
                <p className="mt-3 text-lg font-semibold leading-8 text-white/50">
                  Касс дээр төлбөрийн хэлбэр сонгоод төлбөр авахад энд төлөв
                  автоматаар өөрчлөгдөнө.
                </p>
              </div>
              <p className="text-sm font-semibold text-white/35">
                Сүүлд шинэчлэгдсэн:{" "}
                {hasPayload
                  ? new Date(payload.updatedAt).toLocaleTimeString("mn-MN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  : "-"}
              </p>
            </div>
          )}
        </aside>
      </div>

      {activeSuccess ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-8 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-[2rem] border border-emerald-200/30 bg-white p-10 text-center text-slate-950 shadow-2xl">
            <CheckCircle2 className="mx-auto h-24 w-24 text-emerald-500" />
            <h2 className="mt-6 text-5xl font-black tracking-tight">
              {activeSuccess.title}
            </h2>
            <p className="mt-4 text-xl font-bold text-slate-500">
              {activeSuccess.text}
            </p>
            <div className="mt-8 rounded-3xl bg-emerald-50 p-6">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700/60">
                Төлсөн дүн
              </p>
              <p className="mt-2 text-6xl font-black text-emerald-700">
                {formatMoney(activeSuccess.amount)}
              </p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 text-left">
              <div className="rounded-2xl bg-slate-100 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Баримт
                </p>
                <p className="mt-1 truncate text-lg font-black">
                  {activeSuccess.receiptNo}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Төлбөр
                </p>
                <p className="mt-1 text-lg font-black">
                  {paymentMethodLabel(activeSuccess.paymentMethod)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
