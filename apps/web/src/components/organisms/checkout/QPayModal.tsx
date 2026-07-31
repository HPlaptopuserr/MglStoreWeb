"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  BellRing,
  CheckCircle2,
  Loader2,
  QrCode,
  Smartphone,
} from "lucide-react";
import { QrGenerator } from "@mgl/ui";
import { useAuth } from "@/lib/auth-context";
import { API } from "@/lib/api";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { MobileBankAppLinks } from "@/components/molecules/payments/MobileBankAppLinks";

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
  deepLinks,
  onSuccess,
  onClose,
}: QPayModalProps) {
  const { authFetch } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(600);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLocalDevelopment =
    process.env.NODE_ENV === "development" &&
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname);

  const checkPayment = useCallback(async () => {
    try {
      const res = await authFetch(
        `${API}/store/checkout/${orderId}/payment-status`,
      );
      const data = await res.json();
      if (data.status === "PAID") {
        if (pollRef.current) clearInterval(pollRef.current);
        setConfirmed(true);
        setTimeout(onSuccess, 3500);
        return true;
      }
      if (data.status === "CANCELLED") {
        if (pollRef.current) clearInterval(pollRef.current);
        setCountdown(0);
        setError("Төлбөрийн хугацаа дууссан тул захиалга цуцлагдлаа.");
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

  useLockBodyScroll();

  const handleManualCheck = async () => {
    setChecking(true);
    setError("");
    const paid = await checkPayment();
    if (!paid) {
      setError(
        "Төлбөр хүлээгдэж байна. QPay аппаар төлбөрөө төлөөд дахин шалгана уу.",
      );
    }
    setChecking(false);
  };

  const handleDevConfirm = async () => {
    setChecking(true);
    setError("");
    try {
      const res = await authFetch(
        `${API}/store/checkout/${orderId}/dev-confirm`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Dev төлбөр баталгаажуулахад алдаа гарлаа.");
        return;
      }
      if (data.status === "PAID") {
        if (pollRef.current) clearInterval(pollRef.current);
        setConfirmed(true);
        setTimeout(onSuccess, 1500);
      }
    } catch {
      setError("Dev төлбөр баталгаажуулах үед сүлжээний алдаа гарлаа.");
    } finally {
      setChecking(false);
    }
  };

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const qrImageSrc = qrImage
    ? qrImage.startsWith("data:")
      ? qrImage
      : `data:image/png;base64,${qrImage}`
    : "";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden overscroll-none px-3 py-3 sm:px-4">
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={confirmed ? undefined : onClose}
      />

      <div className="relative z-10 max-h-[calc(100vh-1.5rem)] w-full max-w-lg overflow-y-auto overflow-x-hidden overscroll-contain rounded-3xl bg-[#061836] text-white shadow-2xl sm:max-h-[calc(100vh-2rem)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,#164b86_0%,#0a2a57_38%,#061836_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-white/5" />

        <div className="relative flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/95 text-blue-600 shadow-sm">
              <QrCode size={21} />
            </div>
            <h2 className="text-xl font-black text-white">QPay</h2>
          </div>
          {!confirmed && (
            <button
              onClick={onClose}
              aria-label="QPay цонх хаах"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X size={22} />
            </button>
          )}
        </div>

        <div className="relative px-4 py-4 sm:px-6 sm:py-6">
          {confirmed ? (
            <div className="flex flex-col items-center gap-5 py-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-400/15">
                <CheckCircle2 size={42} className="text-emerald-300" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">
                  Төлбөр амжилттай!
                </p>
                <p className="mt-2 text-sm text-white/70">
                  Захиалга #{orderNumber} баталгаажлаа.
                </p>
              </div>
              <div className="flex max-w-sm items-start gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-left">
                <BellRing
                  size={20}
                  className="mt-0.5 shrink-0 text-emerald-300"
                />
                <div>
                  <p className="text-sm font-black text-emerald-100">
                    Холбогдох ажилтанд мэдээлэл илгээгдлээ
                  </p>
                  <p className="mt-1 text-xs leading-5 text-white/60">
                    Хүргэлтийн ажилтан захиалгын мэдээллийг notification-оор
                    хүлээн авсан.
                  </p>
                </div>
              </div>
              <p className="text-xs text-white/50">
                Захиалгын хуудас руу шилжиж байна...
              </p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-5">
              <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/10 px-3 py-3 shadow-inner sm:px-5 sm:py-4">
                <div className="flex min-w-0 items-center justify-between gap-3 text-xs sm:text-base">
                  <span className="text-white/65">Захиалга:</span>
                  <span className="min-w-0 truncate text-right font-mono text-[11px] text-white sm:text-sm">
                    {orderNumber}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
                  <span className="text-base font-medium text-white/85 sm:text-xl">
                    Нийт дүн:
                  </span>
                  <span className="shrink-0 text-xl font-black text-white sm:text-3xl">
                    ₮{total.toLocaleString()}
                  </span>
                </div>
              </div>

              <div
                className={`${deepLinks.length > 0 ? "hidden sm:flex" : "flex"} flex-col items-center gap-2.5`}
              >
                <div className="max-w-full rounded-2xl bg-white p-2.5 shadow-2xl shadow-slate-950/35 sm:p-4">
                  {qrImageSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrImageSrc}
                      alt="QPay QR Code"
                      className="h-[clamp(168px,54vw,220px)] w-[clamp(168px,54vw,220px)] rounded-xl sm:h-[232px] sm:w-[232px]"
                    />
                  ) : qrText ? (
                    <QrGenerator
                      value={qrText}
                      size={232}
                      level="M"
                      includeMargin
                      className="h-[clamp(168px,54vw,220px)] w-[clamp(168px,54vw,220px)] rounded-xl sm:h-[232px] sm:w-[232px]"
                    />
                  ) : (
                    <div className="flex h-[clamp(168px,54vw,220px)] w-[clamp(168px,54vw,220px)] items-center justify-center rounded-xl bg-gray-50 text-gray-400 sm:h-[232px] sm:w-[232px]">
                      <QrCode size={44} />
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-white/80">
                  <Smartphone size={18} className="text-white/60" />
                  <span>QPay аппликейшнээр уншуулна уу</span>
                </div>
              </div>

              {countdown > 0 ? (
                <p className="text-center text-sm text-white/60">
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

              <MobileBankAppLinks links={deepLinks} />

              <button
                onClick={handleManualCheck}
                disabled={checking || countdown === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-sm font-black text-[#0a2a57] transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
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

              {isLocalDevelopment && (
                <button
                  onClick={handleDevConfirm}
                  disabled={checking || countdown === 0}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300/50 bg-amber-400/15 py-3.5 text-sm font-black text-amber-100 transition-colors hover:bg-amber-400/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {checking ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                  DEV: Төлбөр төлөх
                </button>
              )}

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
