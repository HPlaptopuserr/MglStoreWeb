import { CheckCircle2 } from "lucide-react";

export function ConnectedMerchantStatusCard() {
  return (
    <div role="status" className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
      <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 text-emerald-600" />
      <p className="font-semibold text-emerald-900">Төлбөрийн холболт идэвхтэй</p>
    </div>
  );
}
