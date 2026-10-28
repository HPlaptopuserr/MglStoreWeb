"use client";

import { QRCodeSVG } from "qrcode.react";
import { Loader2, RefreshCw } from "lucide-react";
import type { CheckoutQPayInvoice } from "./PosCheckoutView";

interface Props {
  invoice?: CheckoutQPayInvoice | null;
  pendingId?: string;
  busy: boolean;
  onCheck: (id: string) => void;
  onCancel: () => void;
}

export function CheckoutQPayPanel({
  invoice,
  pendingId,
  busy,
  onCheck,
  onCancel,
}: Props) {
  return (
    <section aria-label="QR төлбөр" className="space-y-3 text-center">
      {invoice?.open && (invoice.qrText || invoice.qrImage) ? (
        <>
          <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3">
            {invoice.qrText ? (
              <QRCodeSVG
                value={invoice.qrText}
                size={200}
                level="M"
                includeMargin
              />
            ) : (
              // The payment provider supplies a data URI; a remote image optimizer cannot read it.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${invoice.qrImage}`}
                alt="Төлбөр төлөх QR"
                className="h-full w-full object-contain"
              />
            )}
          </div>
          <p className="text-xs text-slate-500">
            Хүчинтэй:{" "}
            {new Date(invoice.expiresAt).toLocaleTimeString("mn-MN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </>
      ) : pendingId ? (
        <div
          role="status"
          className="flex min-h-32 items-center justify-center gap-2 rounded-xl bg-slate-50 text-sm text-slate-600"
        >
          <Loader2 size={20} className="animate-spin" />
          Нэхэмжлэлийн төлөв шалгаж байна…
        </div>
      ) : null}
      {pendingId && (
        <>
          <p className="text-xs leading-5 text-slate-500">
            Банк баталгаажуулмагц энэ төлбөр үлдэгдлээс хасагдана. Үлдэгдэлтэй
            бол дараагийн хэсгээ төлнө. Төлсөн бол дахин төлөхгүй хүлээнэ үү.
          </p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onCheck(pendingId)}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={14} />
              Төлөв шалгах
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="min-h-10 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              Төлбөр цуцлах
            </button>
          </div>
        </>
      )}
    </section>
  );
}
