"use client";

import { AlertTriangle, Loader2 } from "lucide-react";

type PosAccessStatus = "checking" | "enabled" | "disabled";

type Props = {
  status: PosAccessStatus;
  message: string;
  onLogout: () => void;
};

export function PosAccessGate({ status, message, onLogout }: Props) {
  if (status === "checking") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm font-medium text-slate-500">
            POS кассын эрх шалгаж байна...
          </p>
        </div>
      </div>
    );
  }

  if (status === "disabled") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
        <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <AlertTriangle size={24} />
          </div>
          <h1 className="mt-4 text-xl font-black text-slate-950">
            POS эрх идэвхгүй байна
          </h1>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            {message}
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex-1 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
            >
              Дахин шалгах
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Гарах
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
