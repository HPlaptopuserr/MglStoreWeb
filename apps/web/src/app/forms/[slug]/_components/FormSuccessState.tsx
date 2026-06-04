"use client";

import { CheckCircle2 } from "lucide-react";

type FormSuccessStateProps = {
  onReset: () => void;
};

export function FormSuccessState({ onReset }: FormSuccessStateProps) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl items-center px-4 py-16">
      <div className="w-full rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-xl shadow-emerald-100">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h3 className="mt-5 text-2xl font-black text-slate-950">
          Хариулт илгээгдлээ
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Таны бөглөсөн мэдээлэл амжилттай бүртгэгдлээ. Ноорог автоматаар
          цэвэрлэгдсэн.
        </p>
        <button
          type="button"
          onClick={onReset}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-5 text-sm font-black text-emerald-700 transition hover:bg-emerald-100"
        >
          Дахин бөглөх
        </button>
      </div>
    </div>
  );
}
