import { Check, Copy } from "lucide-react";
import type { MerchantStatus } from "./types";

type ConnectedMerchantStatusCardProps = {
  status: MerchantStatus;
  copied: boolean;
  onCopyMerchantId: () => void;
};

export function ConnectedMerchantStatusCard({
  status,
  copied,
  onCopyMerchantId,
}: ConnectedMerchantStatusCardProps) {
  return (
    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
      <Check className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold text-emerald-900">
          {status.managedBySystem ? "Minu Dynamic QR холбогдсон" : "QR төлбөрийн мерчант холбогдсон"}
        </p>
        <p className="text-sm text-emerald-700 mt-0.5">
          {status.managedBySystem ? "Merchant code" : "Мерчант ID"}:{" "}
          <span className="font-mono font-bold">{status.merchantId}</span>
        </p>
        {status.managedBySystem && (
          <p className="text-xs text-emerald-600 mt-1">
            API env дээрх SYSTEMQR тохиргоогоор кассын QR төлбөр үүснэ.
          </p>
        )}
        {status.connectedAt && (
          <p className="text-xs text-emerald-600 mt-1">
            {new Date(status.connectedAt).toLocaleDateString("mn-MN")} бүртгэгдсэн
          </p>
        )}
      </div>
      <button
        onClick={onCopyMerchantId}
        className="ml-auto p-1.5 hover:bg-emerald-100 rounded"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-emerald-600" />}
      </button>
    </div>
  );
}
