import React from "react";
import { CheckCircle2, Loader2, QrCode, Smartphone } from "lucide-react";
import { QrGenerator } from "@mgl/ui";
import { MobileBankAppLinks, type PaymentDeepLink } from "@/components/molecules/payments/MobileBankAppLinks";

interface QPayData {
  invoiceId: string;
  qrImage: string;
  qrText: string;
  urls: PaymentDeepLink[];
  amount: number;
}

interface ContractPaymentProps {
  qpayData: QPayData;
  pollCountdown: number;
  checkingPayment: boolean;
  onCheckPayment: () => void;
}

export function ContractPayment({
  qpayData,
  pollCountdown,
  checkingPayment,
  onCheckPayment,
}: ContractPaymentProps) {
  const deepLinks = Array.isArray(qpayData.urls) ? qpayData.urls : [];
  const qrImageSrc = qpayData.qrImage
    ? qpayData.qrImage.startsWith("data:")
      ? qpayData.qrImage
      : `data:image/png;base64,${qpayData.qrImage}`
    : "";

  return (
    <div className="min-h-[100dvh] bg-slate-950 px-3 py-3 sm:flex sm:items-center sm:justify-center sm:px-4">
      <div className="relative mx-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto overflow-x-hidden rounded-3xl bg-[#061836] text-white shadow-2xl sm:max-h-[calc(100dvh-2rem)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,#164b86_0%,#0a2a57_38%,#061836_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-white/5" />

        <div className="relative flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/95 text-blue-600 shadow-sm">
              <QrCode size={21} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-black text-white">QR төлбөр</h2>
              <p className="truncate text-xs text-white/55">
                Гэрээний төлбөр
              </p>
            </div>
          </div>
        </div>

        <div className="relative px-4 py-4 sm:px-6 sm:py-6">
          <div className="space-y-4 sm:space-y-5">
            <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/10 px-3 py-3 shadow-inner sm:px-5 sm:py-4">
              <div className="flex min-w-0 items-center justify-between gap-3 text-xs sm:text-base">
                <span className="text-white/65">Invoice:</span>
                <span className="min-w-0 truncate text-right font-mono text-[11px] text-white sm:text-sm">
                  {qpayData.invoiceId}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
                <span className="text-base font-medium text-white/85 sm:text-xl">
                  Төлөх дүн:
                </span>
                <span className="shrink-0 text-xl font-black text-white sm:text-3xl">
                  {qpayData.amount.toLocaleString()}₮
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
                    alt="Төлбөрийн QR код"
                    className="h-[clamp(168px,54vw,220px)] w-[clamp(168px,54vw,220px)] rounded-xl sm:h-[232px] sm:w-[232px]"
                  />
                ) : qpayData.qrText ? (
                  <QrGenerator
                    value={qpayData.qrText}
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
              <div className="flex items-center justify-center gap-2 text-center text-sm text-white/80">
                <Smartphone size={18} className="shrink-0 text-white/60" />
                <span>Банкны аппликейшнээр QR кодоо уншуулна уу</span>
              </div>
            </div>

            <MobileBankAppLinks links={deepLinks} />

            <div className="rounded-2xl border border-blue-200/10 bg-blue-300/10 px-4 py-3">
              <div className="flex items-center justify-center gap-2 text-sm text-blue-50">
                <Loader2 className="h-4 w-4 animate-spin text-blue-200" />
                <span>
                  Дараагийн шалгалт:{" "}
                  <span className="font-mono font-black text-white">
                    {pollCountdown}с
                  </span>
                </span>
              </div>
            </div>

            <button
              onClick={onCheckPayment}
              disabled={checkingPayment}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-sm font-black text-[#0a2a57] transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {checkingPayment ? (
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
              Төлбөр төлөгдсөний дараа гэрээний төлөв автоматаар шинэчлэгдэнэ.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
