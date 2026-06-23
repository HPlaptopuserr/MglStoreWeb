"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2 } from "lucide-react";
import {
  CUSTOMER_DISPLAY_THEME_STORAGE_KEY,
  PosCustomerDisplay,
  type CartLine,
  type CartTotals,
  type CheckoutLoyaltyRedeemSession,
  type CustomerDisplayThemeId,
  isCustomerDisplayThemeId,
} from "@/features/pos";

const CUSTOMER_DISPLAY_CHANNEL = "mgl-pos-customer-display";

type CustomerPayload = {
  lines: CartLine[];
  totals: CartTotals;
  displayTheme?: CustomerDisplayThemeId;
  qpayModal: {
    open: boolean;
    invoiceId: string;
    amount: number;
    qrText: string;
    qrImage: string;
    expiresAt: string;
  } | null;
  loyaltyRedeemSession?: CheckoutLoyaltyRedeemSession | null;
  customerSuccess?: {
    text: string;
    amount: number;
    ts: number;
  } | null;
  ts: number;
};

const EMPTY_TOTALS: CartTotals = {
  subTotal: 0,
  taxTotal: 0,
  discountTotal: 0,
  grandTotal: 0,
};

function formatMoney(value: number) {
  return `₮${Math.round(Number(value) || 0).toLocaleString("mn-MN")}`;
}

const customerDisplayFont = {
  fontFamily: '"Times New Roman", Times, serif',
};

export default function CustomerDisplayPage() {
  const [payload, setPayload] = useState<CustomerPayload>({
    lines: [],
    totals: EMPTY_TOTALS,
    displayTheme: "white",
    qpayModal: null,
    loyaltyRedeemSession: null,
    customerSuccess: null,
    ts: Date.now(),
  });

  useEffect(() => {
    const storedTheme = localStorage.getItem(
      CUSTOMER_DISPLAY_THEME_STORAGE_KEY,
    );
    const fallbackTheme = isCustomerDisplayThemeId(storedTheme)
      ? storedTheme
      : "white";
    const withTheme = (next: CustomerPayload): CustomerPayload => ({
      ...next,
      displayTheme: isCustomerDisplayThemeId(next.displayTheme)
        ? next.displayTheme
        : fallbackTheme,
    });

    const fromStorage = localStorage.getItem("mgl_pos_customer_payload");
    if (fromStorage) {
      try {
        const parsed = JSON.parse(fromStorage) as CustomerPayload;
        setPayload(withTheme(parsed));
      } catch {
        // ignore malformed payload
      }
    } else {
      setPayload((current) => ({ ...current, displayTheme: fallbackTheme }));
    }

    const channel = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL);
    channel.onmessage = (event: MessageEvent<CustomerPayload>) => {
      setPayload(withTheme(event.data));
    };

    return () => channel.close();
  }, []);

  const qrText = payload.qpayModal?.qrText || "";
  const qrSrc = payload.qpayModal?.qrImage
    ? `data:image/png;base64,${payload.qpayModal.qrImage}`
    : null;

  return (
    <div style={customerDisplayFont}>
      <PosCustomerDisplay
        lines={payload.lines}
        totals={payload.totals}
        theme={payload.displayTheme}
      />

      {payload.qpayModal?.open && (qrSrc || qrText) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-8 backdrop-blur-md">
          <div className="grid w-full max-w-5xl grid-cols-[minmax(0,1fr)_360px] gap-8 rounded-[2rem] border border-white/10 bg-white p-8 shadow-2xl">
            <div className="flex flex-col justify-between rounded-3xl bg-slate-950 p-8 text-white">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.28em] text-amber-400">
                  QPay төлбөр
                </p>
                <h2 className="mt-4 text-5xl font-black leading-tight tracking-tight">
                  QR код уншуулна уу
                </h2>
                <p className="mt-4 max-w-md text-lg font-medium leading-relaxed text-white/65">
                  Банкны аппликейшнээр уншуулсны дараа төлбөр автоматаар
                  баталгаажна.
                </p>
              </div>

              <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.06] p-6">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
                  Төлөх дүн
                </p>
                <p className="mt-2 break-words text-6xl font-black leading-none text-amber-400">
                  {formatMoney(payload.qpayModal.amount)}
                </p>
              </div>
            </div>

            <div className="flex flex-col">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                {qrSrc ? (
                  <img
                    src={qrSrc}
                    alt="QPay QR"
                    className="mx-auto h-[300px] w-[300px] rounded-2xl bg-white"
                  />
                ) : (
                  <QRCodeSVG
                    value={qrText}
                    size={300}
                    level="M"
                    includeMargin
                    className="mx-auto rounded-2xl bg-white"
                  />
                )}
              </div>

              <div className="mt-5 space-y-3 rounded-3xl border border-slate-200 bg-white p-5 text-left">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Нэхэмжлэл
                  </p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-800">
                    {payload.qpayModal.invoiceId}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Дүн
                    </p>
                    <p className="mt-1 text-xl font-black text-slate-950">
                      {formatMoney(payload.qpayModal.amount)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Хүчинтэй
                    </p>
                    <p className="mt-1 text-xl font-black text-slate-950">
                      {new Date(payload.qpayModal.expiresAt).toLocaleTimeString(
                        "mn-MN",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!payload.qpayModal?.open && payload.loyaltyRedeemSession?.qrPayload && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 p-8 backdrop-blur-md">
          <div className="grid w-full max-w-5xl grid-cols-[minmax(0,1fr)_360px] gap-8 rounded-[2rem] border border-amber-300/30 bg-white p-8 shadow-2xl">
            <div className="flex flex-col justify-between rounded-3xl bg-slate-950 p-8 text-white">
              <div>
                <p className="text-sm font-black uppercase text-amber-400">
                  M Point ашиглах
                </p>
                <h2 className="mt-4 text-5xl font-black leading-tight">
                  MGL app-аар QR уншуулна уу
                </h2>
                <p className="mt-4 max-w-md text-lg font-medium leading-relaxed text-white/65">
                  Оноо ашиглах хүсэлтийг апп дотроо баталгаажуулсны дараа касс
                  төлбөрийг үргэлжлүүлнэ.
                </p>
              </div>

              <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.06] p-6">
                <p className="text-xs font-black uppercase text-white/45">
                  Ашиглах оноо
                </p>
                <p className="mt-2 break-words text-6xl font-black leading-none text-amber-400">
                  {payload.loyaltyRedeemSession.requestedPoints.toLocaleString("mn-MN")} M
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                <QRCodeSVG
                  value={payload.loyaltyRedeemSession.qrPayload}
                  size={300}
                  level="M"
                  includeMargin
                  className="mx-auto rounded-2xl bg-white"
                />
              </div>

              <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 text-center">
                {payload.loyaltyRedeemSession.status === "CONFIRMED" ? (
                  <div className="flex items-center justify-center gap-2 text-emerald-600">
                    <CheckCircle2 className="h-6 w-6" />
                    <p className="text-xl font-black">Баталгаажсан</p>
                  </div>
                ) : (
                  <p className="text-lg font-black text-slate-950">
                    Апп баталгаажуулалт хүлээж байна
                  </p>
                )}
                <p className="mt-2 text-sm font-bold text-slate-500">
                  Дуусах:{" "}
                  {new Date(
                    payload.loyaltyRedeemSession.expiresAt,
                  ).toLocaleTimeString("mn-MN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!payload.qpayModal?.open &&
        !payload.loyaltyRedeemSession?.qrPayload &&
        payload.customerSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-emerald-950/85 p-8 text-white backdrop-blur-md">
          <div className="flex w-full max-w-3xl flex-col items-center rounded-[2rem] border border-emerald-300/30 bg-white p-10 text-center text-slate-950 shadow-2xl">
            <CheckCircle2
              className="h-28 w-28 text-emerald-500"
              strokeWidth={2.2}
            />
            <p className="mt-6 text-sm font-black uppercase tracking-[0.28em] text-emerald-600">
              Төлбөр баталгаажлаа
            </p>
            <h2 className="mt-3 text-5xl font-black tracking-tight text-slate-950">
              {payload.customerSuccess.text || "Төлбөр амжилттай"}
            </h2>
            <p className="mt-5 break-words text-6xl font-black leading-none text-emerald-600">
              {formatMoney(payload.customerSuccess.amount)}
            </p>
            <p className="mt-6 text-lg font-semibold text-slate-500">
              Баярлалаа. Таны худалдан авалт бүртгэгдлээ.
            </p>
          </div>
        </div>
        )}
    </div>
  );
}
