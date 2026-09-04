"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { API, authFetch } from "@/lib/api";

type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";

type PaymentQrInvoice = {
  paymentId: string;
  invoiceNumber: string;
  amount: number;
  qrText: string;
  qrImage: string;
  expiresIn: number;
  deepLinks: Array<{
    name: string;
    description: string;
    logo: string;
    link: string;
  }>;
  devMode?: boolean;
};

type StockPaymentQrSectionProps = {
  paymentId: string;
  onPaid: () => void | Promise<void>;
};

export function StockPaymentQrSection({
  paymentId,
  onPaid,
}: StockPaymentQrSectionProps) {
  const [invoice, setInvoice] = useState<PaymentQrInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [confirmingDev, setConfirmingDev] = useState(false);
  const [error, setError] = useState("");
  const [paid, setPaid] = useState(false);
  const onPaidRef = useRef(onPaid);

  useEffect(() => {
    onPaidRef.current = onPaid;
  }, [onPaid]);

  const createInvoice = async () => {
    setLoading(true);
    setError("");
    setInvoice(null);
    try {
      const response = await authFetch(
        `${API}/stock-requests/payments/${paymentId}/qpay`,
        { method: "POST" },
      );
      const body = (await response.json().catch(() => ({}))) as
        | PaymentQrInvoice
        | { message?: string };
      if (!response.ok || !("paymentId" in body)) {
        throw new Error(
          "message" in body && body.message
            ? body.message
            : "Төлбөрийн QR үүсгэж чадсангүй",
        );
      }
      setInvoice(body);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Төлбөрийн QR үүсгэж чадсангүй",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPaid(false);
    void createInvoice();
    // A new payment id represents a new invoice session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  useEffect(() => {
    if (!invoice || invoice.devMode || paid) return;

    const checkStatus = async () => {
      setChecking(true);
      try {
        const response = await authFetch(
          `${API}/stock-requests/payments/${invoice.paymentId}/qpay/status`,
        );
        if (!response.ok) return;
        const body = (await response.json()) as { status?: PaymentStatus };
        if (body.status === "PAID") {
          setPaid(true);
          await onPaidRef.current();
        }
      } finally {
        setChecking(false);
      }
    };

    void checkStatus();
    const interval = window.setInterval(() => void checkStatus(), 3000);
    return () => window.clearInterval(interval);
  }, [invoice, paid]);

  const confirmDevelopmentPayment = async () => {
    if (!invoice?.devMode) return;
    setConfirmingDev(true);
    setError("");
    try {
      const response = await authFetch(
        `${API}/stock-requests/payments/${invoice.paymentId}/qpay/dev-confirm`,
        { method: "POST" },
      );
      const body = (await response.json().catch(() => ({}))) as {
        status?: PaymentStatus;
        message?: string;
      };
      if (!response.ok || body.status !== "PAID") {
        throw new Error(body.message || "Туршилтын төлбөр баталгаажсангүй");
      }
      setPaid(true);
      await onPaidRef.current();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Төлбөр баталгаажсангүй",
      );
    } finally {
      setConfirmingDev(false);
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-blue-50 p-4 print:hidden sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-900">QR-аар төлөх</h3>
          <p className="mt-1 text-xs text-slate-500">
            Банкны апп-аар уншуулахад нэхэмжлэхийн үлдэгдэл дүн автоматаар бөглөгдөнө.
          </p>
        </div>
        {invoice ? (
          <span className="shrink-0 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
            {Number(invoice.amount).toLocaleString("mn-MN")}₮
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="grid min-h-52 place-items-center rounded-2xl bg-white/70">
          <div className="text-center text-sm font-semibold text-violet-700">
            <Loader2 className="mx-auto mb-2 h-7 w-7 animate-spin" />
            Төлбөрийн QR үүсгэж байна
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => void createInvoice()}
            className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            Дахин оролдох
          </button>
        </div>
      ) : paid ? (
        <div className="grid min-h-52 place-items-center rounded-2xl bg-emerald-50 text-center text-emerald-700">
          <div>
            <CheckCircle className="mx-auto h-10 w-10" />
            <p className="mt-3 font-bold">Төлбөр амжилттай баталгаажлаа</p>
          </div>
        </div>
      ) : invoice ? (
        <div className="grid gap-5 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
          <div className="mx-auto flex h-[220px] w-[220px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            {invoice.qrImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${invoice.qrImage}`}
                alt="Нэхэмжлэх төлөх QR код"
                className="h-full w-full object-contain"
              />
            ) : invoice.qrText ? (
              <QRCodeSVG
                value={invoice.qrText}
                size={190}
                level="M"
                aria-label="Нэхэмжлэх төлөх QR код"
              />
            ) : (
              <p className="text-sm text-slate-500">QR мэдээлэл ирсэнгүй</p>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800">
              {invoice.devMode ? "Туршилтын QR" : "QR кодоо уншуулж төлнө үү"}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {invoice.devMode
                ? "Энэ төлбөр зөвхөн local хөгжүүлэлтийн орчинд ажиллана."
                : "Төлбөр орж ирмэгц нэхэмжлэхийн төлөв автоматаар шинэчлэгдэнэ."}
            </p>

            {invoice.deepLinks.length > 0 ? (
              <div className="mt-4 grid max-h-36 grid-cols-2 gap-2 overflow-y-auto pr-1">
                {invoice.deepLinks.map((bank) => (
                  <a
                    key={`${bank.name}-${bank.link}`}
                    href={bank.link}
                    className="flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-bold text-slate-700 transition hover:border-violet-300 hover:text-violet-700"
                  >
                    <span className="truncate">{bank.name}</span>
                  </a>
                ))}
              </div>
            ) : null}

            {invoice.devMode ? (
              <button
                type="button"
                onClick={() => void confirmDevelopmentPayment()}
                disabled={confirmingDev}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60"
              >
                {confirmingDev ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Төлсөн гэж батлах (Local)
              </button>
            ) : (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-violet-100/70 px-3 py-2.5 text-xs font-semibold text-violet-700">
                <Loader2 className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
                Төлбөрийн төлөв шалгаж байна
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
