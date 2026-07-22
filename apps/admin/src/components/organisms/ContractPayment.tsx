import React from "react";
import { QrCode, Loader2, Smartphone, CheckCircle2 } from "lucide-react";

import { QRCodeCanvas } from "qrcode.react";

interface QPayDeeplink {
  name: string;
  link: string;
  logo?: string;
  description?: string;
}

interface QPayData {
  invoiceId: string;
  qrImage?: string;
  qrText: string;
  urls: QPayDeeplink[];
  amount: number;
}

interface ContractPaymentProps {
  qpayData: QPayData;
  pollCountdown: number;
  checkingPayment: boolean;
  onCheckPayment: () => void;
}

function PaymentQr({ data }: { data: QPayData }) {
  if (data.qrImage) {
    const source = data.qrImage.startsWith("data:")
      ? data.qrImage
      : `data:image/png;base64,${data.qrImage}`;
    return (
      <img
        src={source}
        alt="QPay төлбөрийн QR код"
        className="h-52 w-52 rounded-xl border-2 border-neutral-200 shadow-sm"
      />
    );
  }

  if (data.qrText) {
    return (
      <div className="rounded-xl border-2 border-neutral-200 bg-white p-2 shadow-sm">
        <QRCodeCanvas value={data.qrText} size={192} />
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex h-52 w-52 items-center justify-center rounded-xl border-2 border-neutral-200 bg-neutral-100 text-sm text-neutral-400"
    >
      QR код ачааллаж байна...
    </div>
  );
}

function BankDeeplinks({ urls }: { urls: QPayDeeplink[] }) {
  if (urls.length === 0) return null;

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center gap-2 text-xs text-neutral-500">
        <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
        Банкны аппаар нэвтрэх:
      </div>
      <div className="grid grid-cols-2 gap-2">
        {urls.slice(0, 6).map((url) => (
          <a
            key={url.name}
            href={url.link}
            className="flex items-center gap-2 truncate rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {url.logo && (
              <img
                src={url.logo}
                alt=""
                className="h-5 w-5 flex-shrink-0 rounded"
              />
            )}
            {url.description || url.name}
          </a>
        ))}
      </div>
    </div>
  );
}

export function ContractPayment({
  qpayData,
  pollCountdown,
  checkingPayment,
  onCheckPayment,
}: ContractPaymentProps) {
  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-neutral-100 overflow-hidden">
        <div className="bg-[#1e4e8c] p-6 text-white text-center">
          <QrCode className="w-12 h-12 mx-auto mb-3 opacity-90" />
          <h2 className="text-xl font-bold">Хураамж төлөх</h2>
          <p className="text-blue-200 text-sm mt-1">
            Төлбөр төлөгдсөнөөр гэрээ хүчин төгөлдөр болно.
          </p>
        </div>

        <div className="p-6 flex flex-col items-center gap-5">
          <PaymentQr data={qpayData} />

          <div className="text-center">
            <div className="text-sm text-neutral-500">Төлөх дүн</div>
            <div className="text-3xl font-bold text-neutral-900">
              {qpayData.amount.toLocaleString()} ₮
            </div>
          </div>

          <div className="w-full bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            </div>
            <div className="text-sm text-blue-700">
              Төлбөр автоматаар шалгагдаж байна...
              <span className="ml-1 font-semibold text-blue-900">
                {pollCountdown}с
              </span>
            </div>
          </div>

          <BankDeeplinks urls={qpayData.urls} />

          <button
            onClick={onCheckPayment}
            disabled={checkingPayment}
            className="w-full px-6 py-3.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            {checkingPayment ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Шалгаж байна...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" /> Төлбөр төлсөн
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
