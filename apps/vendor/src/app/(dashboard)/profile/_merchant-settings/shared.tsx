import type { MerchantMessage } from "./types";

export function MerchantSettingsMessage({ message }: { message: MerchantMessage | null }) {
  if (!message) return null;

  return (
    <div
      className={`rounded-lg p-3 text-sm ${
        message.type === "success"
          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
          : "bg-red-50 text-red-800 border border-red-200"
      }`}
    >
      {message.text}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
