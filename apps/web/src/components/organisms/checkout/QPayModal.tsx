"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, CheckCircle2, Loader2, QrCode, Smartphone } from "lucide-react";
import { QrGenerator } from "@mgl/ui";
import { useAuth } from "@/lib/auth-context";
import { API } from "@/lib/api";

interface DeepLink {
  name: string;
  description: string;
  logo: string;
  link: string;
}

interface QPayModalProps {
  orderId: string;
  orderNumber: string;
  total: number;
  qrText: string;
  qrImage: string;
  deepLinks: DeepLink[];
  onSuccess: () => void;
  onClose: () => void;
}

export function QPayModal({
  orderId,
  orderNumber,
  total,
  qrText,
  qrImage,
  onSuccess,
  onClose,
}: QPayModalProps) {
  const { authFetch } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(300);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkPayment = useCallback(async () => {
    try {
      const res = await authFetch(`${API}/store/checkout/${orderId}/payment-status`);
      const data = await res.json();
      if (data.status === "PAID") {
        if (pollRef.current) clearInterval(pollRef.current);
        setConfirmed(true);
        setTimeout(onSuccess, 2000);
        return true;
      }
    } catch {
      // Retry on the next poll.
    }
    return false;
  }, [authFetch, orderId, onSuccess]);

  useEffect(() => {
    if (confirmed) return;
    pollRef.current = setInterval(() => {
      checkPayment();
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [confirmed, checkPayment]);

  useEffect(() => {
    if (confirmed) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (pollRef.current) clearInterval(pollRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [confirmed]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleManualCheck = async () => {
    setChecking(true);
    setError("");
    const paid = await checkPayment();
    if (!paid) {
      setError("Төлбөр хүлээгдэж байна. QPay аппаар төлбөрөө төлөөд дахин шалгана уу.");
    }
    setChecking(false);
  };

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const qrImageSrc = qrImage
    ? qrImage.startsWith("data:")
      ? qrImage
      : `data:image/png;base64,${qrImage}`
    : "";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-3 py-5 sm:px-4">
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={confirmed ? undefined : onClose}
      />

      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-[28px] bg-[#061836] text-white shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,#164b86_0%,#0a2a57_38%,#061836_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-white/5" />

        <div className="relative flex items-center justify-between border-b border-white/10 px-6 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/95 text-blue-600 shadow-sm">
              <QrCode size={23} />
            </div>
            <h2 className="text-2xl font-black text-white">QPay</h2>
          </div>
          {!confirmed && (
            <button
              onClick={onClose}
              aria-label="QPay цонх хаах"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X size={24} />
            </button>
          )}
        </div>

        <div className="relative px-6 py-6 sm:px-8 sm:py-8">
          {confirmed ? (
            <div className="flex flex-col items-center gap-5 py-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-400/15">
                <CheckCircle2 size={42} className="text-emerald-300" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">Төлбөр амжилттай!</p>
                <p className="mt-2 text-sm text-white/70">Захиалга #{orderNumber} баталгаажлаа.</p>
              </div>
              <p className="text-xs text-white/50">Захиалгын хуудас руу шилжиж байна...</p>
            </div>
          ) : (
            <div className="space-y-7">
              <div className="rounded-3xl border border-white/15 bg-white/10 px-5 py-5 shadow-inner sm:px-6">
                <div className="flex items-center justify-between gap-4 text-sm sm:text-base">
                  <span className="text-white/65">Захиалга:</span>
                  <span className="min-w-0 truncate text-right font-mono text-white">{orderNumber}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-4">
                  <span className="text-xl font-medium text-white/85 sm:text-2xl">Нийт дүн:</span>
                  <span className="shrink-0 text-3xl font-black text-white sm:text-4xl">
                    ₮{total.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="rounded-3xl bg-white p-5 shadow-2xl shadow-slate-950/35">
                  {qrImageSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrImageSrc}
                      alt="QPay QR Code"
                      className="h-[248px] w-[248px] rounded-xl sm:h-[292px] sm:w-[292px]"
                    />
                  ) : qrText ? (
                    <QrGenerator
                      value={qrText}
                      size={292}
                      level="M"
                      includeMargin
                      className="h-[248px] w-[248px] rounded-xl sm:h-[292px] sm:w-[292px]"
                    />
                  ) : (
                    <div className="flex h-[248px] w-[248px] items-center justify-center rounded-xl bg-gray-50 text-gray-400 sm:h-[292px] sm:w-[292px]">
                      <QrCode size={44} />
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-center gap-2 text-base text-white/80">
                  <Smartphone size={18} className="text-white/60" />
                  <span>QPay аппликейшнээр уншуулна уу</span>
                </div>
              </div>

              {countdown > 0 ? (
                <p className="text-center text-base text-white/60">
                  Хүлээх хугацаа:{" "}
                  <span className="font-mono font-black text-white">
                    {minutes}:{String(seconds).padStart(2, "0")}
                  </span>
                </p>
              ) : (
                <p className="text-center text-sm font-medium text-red-200">
                  Хугацаа дууссан. Дахин оролдоно уу.
                </p>
              )}

              {error && (
                <p className="rounded-2xl border border-amber-200/20 bg-amber-300/10 px-4 py-3 text-center text-sm text-amber-100">
                  {error}
                </p>
              )}

              <button
                onClick={handleManualCheck}
                disabled={checking || countdown === 0}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-sm font-black text-[#0a2a57] transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {checking ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Шалгаж байна...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Төлбөр шалгах
                  </>
                )}
              </button>

              <p className="text-center text-xs text-white/45">
                Төлбөр төлөгдсөний дараа төлөв автоматаар шалгагдана.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
