"use client";

import { useState, useEffect, useCallback } from "react";
import { X, CheckCircle2, Loader2, QrCode, Smartphone } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { API } from "@/lib/api";

interface QPayModalProps {
  orderId: string;
  orderNumber: string;
  total: number;
  qrText: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function QPayModal({ orderId, orderNumber, total, qrText, onSuccess, onClose }: QPayModalProps) {
  const { authFetch } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(120);

  // Countdown timer
  useEffect(() => {
    if (confirmed) return;
    const t = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(t);
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

  const handleConfirm = useCallback(async () => {
    setConfirming(true);
    setError("");
    try {
      const res = await authFetch(`${API}/store/checkout/${orderId}/confirm`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Төлбөр баталгаажуулахад алдаа гарлаа");
        setConfirming(false);
        return;
      }
      setConfirmed(true);
      setTimeout(onSuccess, 2000);
    } catch {
      setError("Сүлжээний алдаа гарлаа");
      setConfirming(false);
    }
  }, [authFetch, orderId, onSuccess]);

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={confirmed ? undefined : onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl bg-white shadow-2xl overflow-hidden">
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

              {/* QR Code area */}
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50">
                  <div className="text-center">
                    <QrCode size={64} className="mx-auto text-gray-300" />
                    <p className="mt-2 text-xs text-gray-400 font-mono break-all px-2">{qrText}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Smartphone size={14} />
                  <span>QPay аппликейшнээр уншуулна уу</span>
                </div>
              </div>

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
                <p className="rounded-xl bg-red-50 px-4 py-2 text-center text-sm text-red-600">
                  {error}
                </p>
              )}

              {/* Mock confirm button */}
              <button
                onClick={handleConfirm}
                disabled={confirming || countdown === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 text-sm font-bold text-white transition-colors hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {confirming ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Баталгаажуулж байна...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Төлбөр төлсөн (Demo)
                  </>
                )}
              </button>

              <p className="text-center text-xs text-gray-400">
                Энэ нь туршилтын горим юм. &quot;Төлбөр төлсөн&quot; дарж баталгаажуулна уу.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
