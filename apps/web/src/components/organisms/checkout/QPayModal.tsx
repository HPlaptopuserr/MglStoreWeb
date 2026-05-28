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

export function QPayModal({ orderId, orderNumber, total, qrText, qrImage, deepLinks, onSuccess, onClose }: QPayModalProps) {
  const { authFetch } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(300);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check payment status
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
      // silent — retry on next poll
    }
    return false;
  }, [authFetch, orderId, onSuccess]);

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

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Manual check
  const handleManualCheck = async () => {
    setChecking(true);
    setError("");
    const paid = await checkPayment();
    if (!paid) {
      setError("Төлбөр хүлээгдэж байна. QPay аппаар төлбөрөө төлнө үү.");
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={confirmed ? undefined : onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <QrCode size={18} className="text-blue-600" />
            </div>
            <h2 className="text-base font-bold text-gray-900">QPay төлбөр</h2>
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

        {/* Body */}
        <div className="px-6 py-6 space-y-6">
          {confirmed ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 size={40} className="text-green-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">Төлбөр амжилттай!</p>
                <p className="mt-1 text-sm text-gray-500">
                  Захиалга #{orderNumber} баталгаажлаа
                </p>
              </div>
              <p className="text-xs text-gray-400">Захиалгын хуудас руу шилжиж байна...</p>
            </div>
          ) : (
            <>
              {/* Order info */}
              <div className="rounded-xl bg-gray-50 px-4 py-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Захиалга</span>
                  <span className="font-mono text-gray-700">{orderNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Нийт дүн</span>
                  <span className="text-lg font-black text-gray-900">₮{total.toLocaleString()}</span>
                </div>
              </div>

              {/* QR Code — real base64 image */}
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-2xl border-2 border-gray-200 bg-white p-2">
                  {qrImageSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrImageSrc}
                      alt="QPay QR Code"
                      className="h-52 w-52 rounded-xl"
                    />
                  ) : qrText ? (
                    <QrGenerator
                      value={qrText}
                      size={208}
                      level="M"
                      includeMargin
                      className="rounded-xl"
                    />
                  ) : (
                    <div className="flex h-52 w-52 items-center justify-center rounded-xl bg-gray-50 text-gray-400">
                      <QrCode size={40} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Smartphone size={14} />
                  <span>QPay аппликейшнээр уншуулна уу</span>
                </div>
              </div>

              {/* Bank deeplinks */}
              {deepLinks.length > 0 && (
                <div>
                  <p className="mb-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Банкны апп-аар төлөх
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {deepLinks.map((dl) => {
                      const logoSrc =
                        dl.logo && (dl.logo.startsWith("http") || dl.logo.startsWith("data:"))
                          ? dl.logo
                          : "";

                      return (
                        <a
                          key={dl.name}
                          href={dl.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-100 bg-gray-50 p-2.5 hover:bg-gray-100 transition-colors"
                        >
                          {logoSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={logoSrc} alt={dl.name} className="h-8 w-8 rounded-lg object-contain" />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-gray-400">
                              <Smartphone size={16} />
                            </div>
                          )}
                          <span className="text-[10px] font-medium text-gray-600 text-center leading-tight line-clamp-2">
                            {dl.description}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Countdown */}
              {countdown > 0 ? (
                <p className="text-center text-sm text-gray-400">
                  Хүлээх хугацаа:{" "}
                  <span className="font-mono font-bold text-gray-700">
                    {minutes}:{String(seconds).padStart(2, "0")}
                  </span>
                </p>
              ) : (
                <p className="text-center text-sm text-red-500 font-medium">
                  Хугацаа дууссан. Дахин оролдоно уу.
                </p>
              )}

              {error && (
                <p className="rounded-xl bg-amber-50 px-4 py-2 text-center text-sm text-amber-700">
                  {error}
                </p>
              )}

              {/* Manual check button */}
              <button
                onClick={handleManualCheck}
                disabled={checking || countdown === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 text-sm font-bold text-white transition-colors hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

              <p className="text-center text-xs text-gray-400">
                Төлбөр автоматаар шалгагдана. Эсвэл &quot;Төлбөр шалгах&quot; товч дарна уу.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
