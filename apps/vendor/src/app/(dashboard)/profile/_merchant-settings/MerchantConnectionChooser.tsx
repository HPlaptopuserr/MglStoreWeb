import { AlertCircle } from "lucide-react";
import type { MerchantMessage } from "./types";
import { MerchantSettingsMessage } from "./shared";

interface MerchantConnectionChooserProps {
  message: MerchantMessage | null;
  onCreate: () => void;
  onConnectExisting: () => void;
}

export function MerchantConnectionChooser({
  message,
  onCreate,
  onConnectExisting,
}: MerchantConnectionChooserProps) {
  return (
    <>
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <AlertCircle
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
          aria-hidden="true"
        />
        <div>
          <p className="font-semibold text-amber-900">
            Minu Dynamic QR холбогдоогүй байна
          </p>
          <p className="text-sm text-amber-700">
            Кассын QR төлбөр авахын тулд дэлгүүрээ Minu Dynamic QR дэд
            мерчантаар бүртгүүлнэ.
          </p>
        </div>
      </div>

      <MerchantSettingsMessage message={message} />

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onCreate}
          className="flex min-h-14 items-center justify-center rounded-xl bg-[#5B4CFF] px-5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-[#4A3CDB] focus:outline-none focus:ring-4 focus:ring-indigo-100"
        >
          Шинээр бүртгүүлэх
        </button>
        <button
          type="button"
          onClick={onConnectExisting}
          className="flex min-h-14 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-100"
        >
          Данс аль хэдийн байна
        </button>
      </div>
    </>
  );
}
