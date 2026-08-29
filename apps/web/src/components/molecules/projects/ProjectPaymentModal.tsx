"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, QrCode, Smartphone, X } from "lucide-react";
import { QrGenerator } from "@mgl/ui";
import { MobileBankAppLinks } from "@/components/molecules/payments/MobileBankAppLinks";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { API } from "@/lib/api";
import type { ProjectItem, ProjectPaymentSession } from "./project-types";
import { formatMnt } from "./project-utils";

type ProjectPaymentModalProps = {
  project: ProjectItem;
  payment: ProjectPaymentSession;
  onPaid: (invoiceId: string) => Promise<void>;
  onClose: () => void;
};

export function ProjectPaymentModal({
  project,
  payment,
  onPaid,
  onClose,
}: ProjectPaymentModalProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(300);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const qrImageSrc = payment.qrImage
    ? payment.qrImage.startsWith("data:")
      ? payment.qrImage
      : `data:image/png;base64,${payment.qrImage}`
    : "";

  useLockBodyScroll();

  const checkPayment = useCallback(async () => {
    const params = new URLSearchParams({
      invoiceId: payment.invoiceId,
      projectId: project.id,
    });
    const res = await fetch(
      `${API}/site-settings/projects/systemqr/check?${params}`,
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Төлбөр шалгахад алдаа гарлаа");
    }
    if (data.isPaid) {
      if (pollRef.current) clearInterval(pollRef.current);
      setConfirmed(true);
      await onPaid(payment.invoiceId);
      return true;
    }
    return false;
  }, [onPaid, payment.invoiceId, project.id]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (confirmed) return;
    pollRef.current = setInterval(() => {
      checkPayment().catch(() => {});
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [checkPayment, confirmed]);

  useEffect(() => {
    if (confirmed) return;

    const updateCountdown = () => {
      if (!payment.expiresAt) {
        setCountdown((prev) => Math.max(prev - 1, 0));
        return;
      }

      const secondsLeft = Math.max(
        0,
        Math.ceil((new Date(payment.expiresAt).getTime() - Date.now()) / 1000),
      );
      setCountdown(secondsLeft);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [confirmed, payment.expiresAt]);

  const handleManualCheck = async () => {
    setChecking(true);
    setError("");
    try {
      const paid = await checkPayment();
      if (!paid) {
        setError("Төлбөр хүлээгдэж байна. QR уншуулж төлөөд дахин шалгана уу.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Төлбөр шалгахад алдаа гарлаа",
      );
    } finally {
      setChecking(false);
    }
  };

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden overscroll-none px-3 py-3 sm:px-4">
      <button
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={confirmed ? undefined : onClose}
        aria-label="Хаах"
      />

      <article className="relative z-10 max-h-[calc(100vh-1.5rem)] w-full max-w-lg overflow-y-auto overflow-x-hidden overscroll-contain rounded-3xl bg-[#061836] text-white shadow-2xl sm:max-h-[calc(100vh-2rem)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,#164b86_0%,#0a2a57_38%,#061836_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-white/5" />

        <div className="relative flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/95 text-blue-600 shadow-sm">
              <QrCode size={21} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-black text-white">QR төлбөр</h2>
              <p className="truncate text-xs font-semibold text-white/55">
                {project.title}
              </p>
            </div>
          </div>
          {!confirmed && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Хаах"
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
                  Дэлгэрэнгүй мэдээллийг нээж байна...
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-5">
              <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/10 px-3 py-3 shadow-inner sm:px-5 sm:py-4">
                <div className="flex min-w-0 items-center justify-between gap-3 text-xs sm:text-base">
                  <span className="text-white/65">Нэхэмжлэх:</span>
                  <span className="min-w-0 truncate text-right font-mono text-[11px] text-white sm:text-sm">
                    {payment.invoiceId}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
                  <span className="text-base font-medium text-white/85 sm:text-xl">
                    Нийт дүн:
                  </span>
                  <span className="shrink-0 text-xl font-black text-white sm:text-3xl">
                    {formatMnt(payment.amount)}
                  </span>
                </div>
              </div>

              <div
                className={`${payment.urls.length > 0 ? "hidden sm:flex" : "flex"} flex-col items-center gap-2.5`}
              >
                <div className="max-w-full rounded-2xl bg-white p-2.5 shadow-2xl shadow-slate-950/35 sm:p-4">
                  {qrImageSrc ? (
                    <img
                      src={qrImageSrc}
                      alt="Dynamic QR"
                      className="h-[clamp(168px,54vw,220px)] w-[clamp(168px,54vw,220px)] rounded-xl sm:h-[232px] sm:w-[232px]"
                    />
                  ) : payment.qrText ? (
                    <QrGenerator
                      value={payment.qrText}
                      size={232}
                      level="M"
                      includeMargin
                      className="h-[clamp(168px,54vw,220px)] w-[clamp(168px,54vw,220px)] rounded-xl sm:h-[232px] sm:w-[232px]"
                    />
                  ) : (
                    <div className="flex h-[clamp(168px,54vw,220px)] w-[clamp(168px,54vw,220px)] items-center justify-center rounded-xl bg-gray-50 text-center text-sm font-bold text-gray-400 sm:h-[232px] sm:w-[232px]">
                      QR мэдээлэл ирсэнгүй
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-white/80">
                  <Smartphone size={18} className="text-white/60" />
                  <span>Банкны апп-аар QR кодоо уншуулна уу</span>
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

              <MobileBankAppLinks links={payment.urls} />

              {error && (
                <p className="rounded-2xl border border-amber-200/20 bg-amber-300/10 px-4 py-3 text-center text-sm text-amber-100">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleManualCheck}
                disabled={checking || countdown === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-sm font-black text-[#0a2a57] transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {checking ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={18} />
                )}
                {checking ? "Шалгаж байна..." : "Төлбөр шалгах"}
              </button>

              <p className="text-center text-xs text-white/45">
                Төлбөр төлөгдсөний дараа төлөв автоматаар шалгагдана.
              </p>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
