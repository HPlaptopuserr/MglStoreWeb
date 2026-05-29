import { Loader2 } from "lucide-react";
import type { ManualPaymentProvider } from "./types";
import { merchantInputClass } from "./constants";
import { Field } from "./shared";

type ManualMerchantConnectionPanelProps = {
  provider: ManualPaymentProvider;
  merchantId: string;
  merchantKey: string;
  invoiceCode: string;
  recoveryRegNum: string;
  recoveryLoading: boolean;
  isSubmitting: boolean;
  onProviderChange: (provider: ManualPaymentProvider) => void;
  onMerchantIdChange: (value: string) => void;
  onMerchantKeyChange: (value: string) => void;
  onInvoiceCodeChange: (value: string) => void;
  onRecoveryRegNumChange: (value: string) => void;
  onRecover: () => void;
  onConnect: () => void;
};

export function ManualMerchantConnectionPanel({
  provider,
  merchantId,
  merchantKey,
  invoiceCode,
  recoveryRegNum,
  recoveryLoading,
  isSubmitting,
  onProviderChange,
  onMerchantIdChange,
  onMerchantKeyChange,
  onInvoiceCodeChange,
  onRecoveryRegNumChange,
  onRecover,
  onConnect,
}: ManualMerchantConnectionPanelProps) {
  const isSystemQr = provider === "systemqr";

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-2 border-b pb-2 border-slate-100">
          Мэдээллээ сэргээх (Мартсан үед)
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Та QPay мерчант бүртгэлтэй ч ID/Key-ээ мартсан бол регистрийн дугаараараа хайж олох боломжтой.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={recoveryRegNum}
            onChange={(event) => onRecoveryRegNumChange(event.target.value)}
            placeholder="Регистрийн дугаар (Ж: АМ12345678)"
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4CFF]/30 focus:border-[#5B4CFF] focus:bg-white transition-all"
          />
          <button
            onClick={onRecover}
            disabled={recoveryLoading || !recoveryRegNum}
            className="px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            {recoveryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Хайх & Холбох
          </button>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-slate-400 font-semibold tracking-wider">Эсвэл гараар оруулах</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600">Төлбөрийн төрөл</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onProviderChange("qpay")}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${provider === "qpay" ? "border-[#5B4CFF] bg-[#5B4CFF] text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              QPay V2
            </button>
            <button
              type="button"
              onClick={() => onProviderChange("systemqr")}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${provider === "systemqr" ? "border-[#5B4CFF] bg-[#5B4CFF] text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              Minu Dynamic QR
            </button>
          </div>
        </div>

        <Field label={isSystemQr ? "Merchant Code *" : "Мерчант ID *"}>
          <input
            type="text"
            value={merchantId}
            onChange={(event) => onMerchantIdChange(event.target.value)}
            placeholder={isSystemQr ? "Жишээ: MC000123" : "Жишээ: MYSHOP_MN"}
            className={merchantInputClass}
          />
        </Field>

        {!isSystemQr ? (
          <>
            <Field label="Мерчант Key *">
              <input
                type="password"
                value={merchantKey}
                onChange={(event) => onMerchantKeyChange(event.target.value)}
                placeholder="•••••••••"
                className={merchantInputClass}
              />
            </Field>
            <Field label="Invoice Code (заавал биш)">
              <input
                type="text"
                value={invoiceCode}
                onChange={(event) => onInvoiceCodeChange(event.target.value)}
                placeholder="Хоосон орхивол Мерчант ID ашиглагдана"
                className={merchantInputClass}
              />
            </Field>
          </>
        ) : (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            Энэ тохиргоо POS кассын QR төлбөрийг Minu Dynamic QR merchantCode-оор үүсгэнэ.
          </div>
        )}

        <button
          onClick={onConnect}
          disabled={isSubmitting || !merchantId || (!isSystemQr && !merchantKey)}
          className="w-full py-3 rounded-lg bg-[#5B4CFF] hover:bg-[#4A3CDB] text-white font-semibold shadow-md shadow-[#5B4CFF]/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 transition-all"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Холбох
        </button>
      </div>
    </div>
  );
}
