"use client";

import { RefreshCw, WifiOff } from "lucide-react";

interface OrganizationsErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function OrganizationsErrorState({ message, onRetry }: OrganizationsErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center rounded-[1.75rem] border border-red-100 bg-white px-5 py-20 text-center shadow-sm">
      <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-red-50 ring-8 ring-red-50/60">
        <WifiOff className="h-7 w-7 text-red-500" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-black text-slate-950">Мэдээлэл авч чадсангүй</h3>
      <p className="mt-2 max-w-sm text-sm font-medium leading-6 text-slate-500">{message}</p>
      <button type="button" onClick={onRetry} className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
        <RefreshCw className="h-4 w-4" aria-hidden="true" /> Дахин оролдох
      </button>
    </div>
  );
}
