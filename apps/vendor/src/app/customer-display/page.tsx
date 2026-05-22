"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { PosCustomerDisplay, type CartLine, type CartTotals } from "@/features/pos";

const CUSTOMER_DISPLAY_CHANNEL = "mgl-pos-customer-display";

type CustomerPayload = {
  lines: CartLine[];
  totals: CartTotals;
  qpayModal: {
    open: boolean;
    invoiceId: string;
    amount: number;
    qrText: string;
    qrImage: string;
    expiresAt: string;
  } | null;
  ts: number;
};

const EMPTY_TOTALS: CartTotals = {
  subTotal: 0,
  taxTotal: 0,
  discountTotal: 0,
  grandTotal: 0,
};

export default function CustomerDisplayPage() {
  const [payload, setPayload] = useState<CustomerPayload>({
    lines: [],
    totals: EMPTY_TOTALS,
    qpayModal: null,
    ts: Date.now(),
  });

  useEffect(() => {
    const fromStorage = localStorage.getItem("mgl_pos_customer_payload");
    if (fromStorage) {
      try {
        const parsed = JSON.parse(fromStorage) as CustomerPayload;
        setPayload(parsed);
      } catch {
        // ignore malformed payload
      }
    }

    const channel = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL);
    channel.onmessage = (event: MessageEvent<CustomerPayload>) => {
      setPayload(event.data);
    };

    return () => channel.close();
  }, []);

  const qrText = payload.qpayModal?.qrText || "";
  const qrSrc = payload.qpayModal?.qrImage
    ? `data:image/png;base64,${payload.qpayModal.qrImage}`
    : null;

  return (
    <>
      <PosCustomerDisplay lines={payload.lines} totals={payload.totals} />

      {payload.qpayModal?.open && (qrSrc || qrText) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/90 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-2xl shadow-slate-300/50">
            <p className="text-xs uppercase tracking-[0.25em] text-amber-500">QPay</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">QR код уншуулна уу</h2>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              {qrSrc ? (
                <img
                  src={qrSrc}
                  alt="QPay QR"
                  className="mx-auto h-64 w-64 rounded-lg"
                />
              ) : (
                <QRCodeSVG value={qrText} size={256} level="M" includeMargin className="mx-auto rounded-lg" />
              )}
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
              <p className="text-xs text-slate-500">Нэхэмжлэл</p>
              <p className="text-sm font-semibold text-slate-800">{payload.qpayModal.invoiceId}</p>

              <p className="mt-3 text-xs text-slate-500">Төлөх дүн</p>
              <p className="text-3xl font-black text-amber-400">₮{payload.qpayModal.amount.toLocaleString()}</p>

              <p className="mt-3 text-xs text-slate-500">Хүчинтэй хугацаа</p>
              <p className="text-sm font-medium text-slate-700">
                {new Date(payload.qpayModal.expiresAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
