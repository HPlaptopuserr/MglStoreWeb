"use client";

import { useEffect, useState } from "react";
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

  const qrSrc = payload.qpayModal
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(payload.qpayModal.qrText)}`
    : null;

  return (
    <>
      <PosCustomerDisplay lines={payload.lines} totals={payload.totals} />

      {payload.qpayModal?.open && qrSrc && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-3xl border border-amber-600/40 bg-zinc-950 p-6 text-center shadow-2xl shadow-amber-900/20">
            <p className="text-xs uppercase tracking-[0.25em] text-amber-500">QPay</p>
            <h2 className="mt-2 text-2xl font-black text-white">QR код уншуулна уу</h2>

            <div className="mt-5 rounded-2xl bg-white p-4">
              <img
                src={qrSrc}
                alt="QPay QR"
                className="mx-auto h-64 w-64 rounded-lg"
              />
            </div>

            <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left">
              <p className="text-xs text-zinc-500">Нэхэмжлэл</p>
              <p className="text-sm font-semibold text-zinc-200">{payload.qpayModal.invoiceId}</p>

              <p className="mt-3 text-xs text-zinc-500">Төлөх дүн</p>
              <p className="text-3xl font-black text-amber-400">₮{payload.qpayModal.amount.toLocaleString()}</p>

              <p className="mt-3 text-xs text-zinc-500">Хүчинтэй хугацаа</p>
              <p className="text-sm font-medium text-zinc-300">
                {new Date(payload.qpayModal.expiresAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
