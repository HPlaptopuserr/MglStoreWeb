"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, CheckCircle2, Loader2, QrCode, Smartphone } from "lucide-react";
import { API } from "@/lib/api";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { MobileBankAppLinks, type PaymentDeepLink } from "@/components/molecules/payments/MobileBankAppLinks";

interface ServiceQPayModalProps {
  orderId: string;
  orderNumber: string;
  total: number;
  qrImage: string;
  invoiceId: string;
  deepLinks: PaymentDeepLink[];
  request?: (url: string, init?: RequestInit) => Promise<Response>;
  onSuccess: () => void;
  onClose: () => void;
}

export function ServiceQPayModal({
  orderNumber,
  total,
  qrImage,
  invoiceId,
  deepLinks,
  request,
  onSuccess,
  onClose,
}: ServiceQPayModalProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(300);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check payment status
  const checkPayment = useCallback(async () => {
    try {
      const res = await (request || fetch)(
        `${API}/site-settings/mgl-services/qpay/check?invoiceId=${invoiceId}`,
      );
      const data = await res.json();
      if (data.isPaid) {
        if (pollRef.current) clearInterval(pollRef.current);
        setConfirmed(true);
        setTimeout(onSuccess, 3000);
        return true;
      }
    } catch {
      // silent â€” retry on next poll
    }
    return false;
  }, [invoiceId, onSuccess, request]);

  // Auto-poll every 3 seconds
  useEffect(() => {
    if (confirmed) return;
    pollRef.current = setInterval(() => {
      checkPayment();
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [confirmed, checkPayment]);

  // Countdown timer
  useEffect(() => {
    if (confirmed) return;
    const t = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          if (pollRef.current) clearInterval(pollRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [confirmed]);

  useLockBodyScroll();

  // Manual check
  const handleManualCheck = async () => {
    setChecking(true);
    setError("");
    const paid = await checkPayment();
    if (!paid) {
      setError(
        "Төлбөр хүлээгдэж байна. Банкны аппаар QR кодоо уншуулаад дахин шалгана уу.",
      );
    }
    setChecking(false);
  };

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden overscroll-none">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={confirmed ? undefined : onClose}
      />

      <div className="relative z-10 mx-4 max-h-[90vh] w-full max-w-md overflow-hidden overflow-y-auto overscroll-contain rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <QrCode size={18} className="text-blue-600" />
            </div>
            <h2 className="text-base font-bold text-gray-900">
              QR төлбөр
            </h2>
          </div>
          {!confirmed && (
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="space-y-5 px-4 py-5 sm:space-y-6 sm:px-6 sm:py-6">
          {confirmed ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 size={40} className="text-green-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">
                  Ð¢Ó©Ð»Ð±Ó©Ñ€ Ð°Ð¼Ð¶Ð¸Ð»Ñ‚Ñ‚Ð°Ð¹!
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Ð—Ð°Ñ…Ð¸Ð°Ð»Ð³Ð° #{orderNumber} Ð±Ð°Ñ‚Ð°Ð»Ð³Ð°Ð°Ð¶Ð»Ð°Ð°
                </p>
                <p className="mt-2 text-sm text-gray-600 font-medium">
                  Ð‘Ð¸Ð´ Ñ‚Ð°Ð½Ñ‚Ð°Ð¹ Ñ‚ÑƒÐ½ ÑƒÐ´Ð°Ñ…Ð³Ò¯Ð¹ Ñ…Ð¾Ð»Ð±Ð¾Ð³Ð´Ð¾Ñ…
                  Ð±Ð¾Ð»Ð½Ð¾. Ð‘Ð°ÑÑ€Ð»Ð°Ð»Ð°Ð°!
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1 overflow-hidden rounded-xl bg-gray-50 px-3 py-3 sm:px-4">
                <div className="flex min-w-0 justify-between gap-3 text-sm">
                  <span className="text-gray-500">Ð—Ð°Ñ…Ð¸Ð°Ð»Ð³Ð°</span>
                  <span className="min-w-0 truncate text-right font-mono text-gray-700">
                    {orderNumber}
                  </span>
                </div>
                <div className="flex flex-wrap items-end justify-between gap-2 text-sm">
                  <span className="text-gray-500">ÐÐ¸Ð¹Ñ‚ Ð´Ò¯Ð½</span>
                  <span className="text-base font-black text-gray-900 sm:text-lg">
                    â‚®{total.toLocaleString()}
                  </span>
                </div>
              </div>

              <div
                className={`${deepLinks.length > 0 ? "hidden sm:flex" : "flex"} flex-col items-center gap-3`}
              >
                <div className="max-w-full rounded-2xl border-2 border-gray-200 bg-white p-2">
                  <img
                    src={`data:image/png;base64,${qrImage}`}
                    alt="Төлбөрийн QR код"
                    className="h-[clamp(168px,54vw,220px)] w-[clamp(168px,54vw,220px)] rounded-xl sm:h-52 sm:w-52"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Smartphone size={14} />
                  <span>
                    Банкны аппликейшнээр QR кодоо уншуулна уу
                  </span>
                </div>
              </div>

              <MobileBankAppLinks links={deepLinks} variant="light" />

              {countdown > 0 ? (
                <p className="text-center text-sm text-gray-400">
                  Ð¥Ò¯Ð»ÑÑÑ… Ñ…ÑƒÐ³Ð°Ñ†Ð°Ð°:{" "}
                  <span className="font-mono font-bold text-gray-700">
                    {minutes}:{String(seconds).padStart(2, "0")}
                  </span>
                </p>
              ) : (
                <p className="text-center text-sm text-red-500 font-medium">
                  Ð¥ÑƒÐ³Ð°Ñ†Ð°Ð° Ð´ÑƒÑƒÑÑÐ°Ð½. Ð”Ð°Ñ…Ð¸Ð½ Ð¾Ñ€Ð¾Ð»Ð´Ð¾Ð½Ð¾ ÑƒÑƒ.
                </p>
              )}

              {error && (
                <p className="rounded-xl bg-amber-50 px-4 py-2 text-center text-sm text-amber-700">
                  {error}
                </p>
              )}

              <button
                onClick={handleManualCheck}
                disabled={checking || countdown === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checking ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Ð¨Ð°Ð»Ð³Ð°Ð¶ Ð±Ð°Ð¹Ð½Ð°...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Ð¢Ó©Ð»Ð±Ó©Ñ€ ÑˆÐ°Ð»Ð³Ð°Ñ…
                  </>
                )}
              </button>

              <p className="text-center text-xs text-gray-400">
                Ð¢Ó©Ð»Ð±Ó©Ñ€ Ð°Ð²Ñ‚Ð¾Ð¼Ð°Ñ‚Ð°Ð°Ñ€ ÑˆÐ°Ð»Ð³Ð°Ð³Ð´Ð°Ð½Ð°. Ð­ÑÐ²ÑÐ»
                &quot;Ð¢Ó©Ð»Ð±Ó©Ñ€ ÑˆÐ°Ð»Ð³Ð°Ñ…&quot; Ñ‚Ð¾Ð²Ñ‡ Ð´Ð°Ñ€Ð½Ð° ÑƒÑƒ.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
