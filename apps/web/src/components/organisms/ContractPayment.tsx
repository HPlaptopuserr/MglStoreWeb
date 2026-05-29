import React from "react";
import { QrCode, Loader2, Smartphone, CheckCircle2 } from "lucide-react";
import { QrGenerator } from "@mgl/ui";

interface QPayData {
  invoiceId: string;
  qrImage: string;
  qrText: string;
  urls: any[];
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
          {qpayData.qrImage ? (
            <img
              src={`data:image/png;base64,${qpayData.qrImage}`}
              alt="QR төлбөр"
              className="w-52 h-52 rounded-xl border-2 border-neutral-200 shadow-sm"
            />
          ) : qpayData.qrText ? (
            <div className="p-2 bg-white rounded-xl border-2 border-neutral-200 shadow-sm">
              <QrGenerator value={qpayData.qrText} size={192} level="M" includeMargin />
            </div>
          ) : (
            <div className="w-52 h-52 bg-neutral-100 rounded-xl border-2 border-neutral-200 flex items-center justify-center text-neutral-400 text-sm">
              QR код ачааллаж байна...
            </div>
          )}

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

          {qpayData.urls.length > 0 && (
            <div className="w-full">
              <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                <Smartphone className="w-3.5 h-3.5" /> Банкны аппаар нэвтрэх:
              </div>
              <div className="grid grid-cols-2 gap-2">
                {qpayData.urls.slice(0, 6).map((u: any) => (
                  <a
                    key={u.name}
                    href={u.link}
                    className="flex items-center gap-2 px-3 py-2 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors truncate"
                  >
                    {u.logo && (
                      <img
                        src={u.logo}
                        alt={u.name}
                        className="w-5 h-5 rounded flex-shrink-0"
                      />
                    )}
                    {u.description || u.name}
                  </a>
                ))}
              </div>
            </div>
          )}

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
