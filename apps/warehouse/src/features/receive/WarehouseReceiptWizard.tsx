"use client";

import { useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { GoodsReceiptDocument } from "@mgl/ui";
import {
  WarehouseReceiptDocument,
  type WarehouseReceiptDocumentProps,
} from "./WarehouseReceiptDocument";

const steps = ["Нийлүүлэгч", "Баримтын мэдээлэл", "Барааны жагсаалт"] as const;
type Step = 0 | 1 | 2;

interface Props {
  step: Step;
  onStepChange: (step: Step) => void;
  source: WarehouseReceiptDocumentProps;
  warehouseId: string;
  products: ReactNode;
  lineCount: number;
  totalQuantity: number;
  totalCost: number;
  submitting: boolean;
  locked: boolean;
  error: string;
  onSubmit: () => void;
}

export function WarehouseReceiptWizard({
  step,
  onStepChange: setStep,
  source,
  warehouseId,
  products,
  lineCount,
  totalQuantity,
  totalCost,
  submitting,
  locked,
  error,
  onSubmit,
}: Props) {
  const [stepError, setStepError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const hasSupplier = Boolean(warehouseId && source.supplier.trim());

  function goTo(next: Step) {
    if (locked || submitting) return;
    if (next > 0 && !hasSupplier) {
      setStepError(
        "Хүлээн авах агуулах сонгоод нийлүүлэгчийн нэрийг оруулна уу.",
      );
      return;
    }
    if (next === 2) {
      const unsupportedFile = source.files.find(
        (file) =>
          ![
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf",
          ].includes(file.type),
      );
      if (unsupportedFile) {
        setStepError(
          `“${unsupportedFile.name}” файлын төрөл тохирохгүй байна. JPG, PNG, WebP эсвэл PDF сонгоно уу.`,
        );
        return;
      }
      const invalidFile = source.files.find(
        (file) => file.size > 10 * 1024 * 1024,
      );
      if (invalidFile) {
        setStepError(
          `“${invalidFile.name}” файл 10 MB-аас их байна. Жижиг файл сонгоно уу.`,
        );
        return;
      }
      if (
        source.documentDate &&
        !/^\d{4}-\d{2}-\d{2}$/.test(source.documentDate)
      ) {
        setStepError("Падааны огноог зөв оруулна уу.");
        return;
      }
    }
    setStepError("");
    setStep(next);
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView({ block: "start", behavior: "instant" });
    });
  }

  return (
    <GoodsReceiptDocument
      submitting={submitting}
      canSubmit={hasSupplier && lineCount > 0}
      destination={source.warehouseName || ""}
      destinationLabel="Агуулах"
      lineCount={lineCount}
      quantityLabel={`${totalQuantity.toLocaleString("mn-MN")} ш`}
      totalCost={totalCost}
      error={error}
      updatesSalePrice={false}
      showSummary={step === 2}
      guidance={
        lineCount === 0 ? "Хүлээн авах бараагаа хайж нэмнэ үү." : undefined
      }
      onSubmit={onSubmit}
    >
      <nav
        aria-label="Бараа хүлээн авах алхмууд"
        className="border-b border-slate-200 bg-slate-50/60 p-4 sm:p-6"
      >
        <ol className="grid grid-cols-3 gap-2 sm:gap-4">
          {steps.map((label, index) => (
            <li key={label}>
              <button
                type="button"
                aria-current={step === index ? "step" : undefined}
                disabled={index > step || locked}
                onClick={() => goTo(index as Step)}
                className={`flex w-full flex-col items-start gap-2 rounded-xl p-2 text-left text-xs font-semibold transition sm:flex-row sm:items-center sm:p-3 sm:text-sm ${step === index ? "bg-white text-blue-700 shadow-sm ring-1 ring-blue-200" : "text-slate-500 enabled:hover:bg-white"}`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${index < step ? "bg-emerald-100 text-emerald-700" : step === index ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}
                >
                  {index < step ? (
                    <Check size={15} aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                {label}
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <div className="px-4 pt-5 sm:px-6">
        <h2
          ref={heading}
          tabIndex={-1}
          className="scroll-mt-20 text-sm font-semibold text-slate-500 outline-none"
        >
          Алхам {step + 1} / 3 · {steps[step]}
        </h2>
        {step === 1 && (
          <p className="mt-2 text-sm text-slate-500">
            Эдгээр мэдээлэл заавал биш. Баримтгүй бол шууд дараагийн алхамд
            шилжиж болно.
          </p>
        )}
      </div>
      {step < 2 && (
        <WarehouseReceiptDocument
          {...source}
          section={step === 0 ? "supplier" : "document"}
        />
      )}
      <div hidden={step !== 2}>
        <div className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:mx-6">
          <div>
            <span className="text-slate-500">Нийлүүлэгч: </span>
            <strong className="text-slate-900">{source.supplier}</strong>
            <p className="mt-1 text-xs text-slate-500">
              {source.warehouseName} · {source.documentDate || "Огноогүй"}
              {source.documentNumber ? ` · ${source.documentNumber}` : ""}
            </p>
          </div>
          <button
            type="button"
            disabled={locked}
            onClick={() => goTo(0)}
            className="rounded-lg px-3 py-2 font-semibold text-blue-600 transition hover:bg-blue-50 disabled:opacity-50"
          >
            Мэдээлэл засах
          </button>
        </div>
        <fieldset disabled={locked || submitting} className="min-w-0">
          {products}
        </fieldset>
      </div>
      {stepError && (
        <p
          role="alert"
          className="mx-4 mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 sm:mx-6"
        >
          {stepError}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 sm:p-6">
        {step > 0 ? (
          <button
            type="button"
            disabled={locked}
            onClick={() => goTo((step - 1) as Step)}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <ArrowLeft size={16} />
            Өмнөх алхам
          </button>
        ) : (
          <p className="text-xs text-slate-500">
            Нийлүүлэгчийн нэрийг оруулахад хангалттай.
          </p>
        )}
        {step < 2 && (
          <button
            type="button"
            disabled={step === 0 && !hasSupplier}
            onClick={() => goTo((step + 1) as Step)}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {step === 0 ? "Дараагийн алхам" : "Бараа нэмэх"}
            <ArrowRight size={16} />
          </button>
        )}
        {locked && (
          <p className="text-xs text-amber-700">
            Ноорог хадгалагдсан. Баталгаажуулах товчийг дахин дарж үргэлжлүүлнэ
            үү.
          </p>
        )}
      </div>
    </GoodsReceiptDocument>
  );
}
