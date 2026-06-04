"use client";

import Link from "next/link";
import { ClipboardList, Loader2 } from "lucide-react";
import FormFillClient from "@/app/forms/[slug]/FormFillClient";
import type { HrForm } from "./hr-form-types";

type HrEmbeddedFormPanelProps = {
  form: HrForm | null;
  formSlug?: string;
  formTitle?: string;
  loading: boolean;
  className?: string;
};

export function HrEmbeddedFormPanel({
  form,
  formSlug,
  formTitle,
  loading,
  className = "",
}: HrEmbeddedFormPanelProps) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm ${className}`}
    >
      <div className="flex flex-col gap-3 border-b border-violet-100 bg-[linear-gradient(180deg,#faf7ff_0%,#ffffff_100%)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <ClipboardList className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-violet-600">
              Холбогдсон маягт
            </p>
            <p className="text-sm font-black text-slate-950">
              {formTitle || form?.title}
            </p>
          </div>
        </div>
        {formSlug && (
          <Link
            href={`/forms/${formSlug}`}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-violet-100 bg-white px-3 text-xs font-black text-violet-700 transition hover:bg-violet-50"
          >
            Тусдаа нээх
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex min-h-[260px] items-center justify-center text-sm font-bold text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Маягт ачаалж байна...
        </div>
      ) : form ? (
        <div
          className="max-h-[620px] overflow-y-auto overscroll-contain bg-slate-50"
          data-lenis-prevent="true"
          onWheel={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.stopPropagation()}
        >
          <FormFillClient form={form} />
        </div>
      ) : (
        <div className="flex min-h-[220px] flex-col items-center justify-center px-6 text-center">
          <p className="text-sm font-black text-slate-700">Маягт олдсонгүй.</p>
          <p className="mt-1 max-w-md text-sm font-semibold leading-6 text-slate-500">
            API асаалттай эсэх болон Admin дээр сонгосон маягтаа шалгана уу.
          </p>
        </div>
      )}
    </div>
  );
}
