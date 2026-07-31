"use client";

import { useState } from "react";
import { Box, Loader2, PackageCheck, Ruler, Scale, X } from "lucide-react";

export interface DeliveryPackageDetails {
  packageCount: number;
  totalWeightKg: number;
  packageLengthCm: number;
  packageWidthCm: number;
  packageHeightCm: number;
  sizeCategory: "SMALL" | "MEDIUM" | "LARGE" | "OVERSIZED";
  isFragile: boolean;
  handlingInstructions: string;
}

interface DeliveryPackageDialogProps {
  orderNumber: string;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (details: DeliveryPackageDetails) => Promise<void>;
}

const SIZE_OPTIONS: Array<{
  value: DeliveryPackageDetails["sizeCategory"];
  label: string;
  hint: string;
}> = [
  { value: "SMALL", label: "Жижиг", hint: "Мотоцикл" },
  { value: "MEDIUM", label: "Дунд", hint: "Суудлын машин" },
  { value: "LARGE", label: "Том", hint: "Том тээш" },
  { value: "OVERSIZED", label: "Хэт овортой", hint: "Фургон" },
];

export function DeliveryPackageDialog({
  orderNumber,
  submitting,
  onClose,
  onSubmit,
}: DeliveryPackageDialogProps) {
  const [form, setForm] = useState({
    packageCount: "1",
    totalWeightKg: "",
    packageLengthCm: "",
    packageWidthCm: "",
    packageHeightCm: "",
    sizeCategory: "SMALL" as DeliveryPackageDetails["sizeCategory"],
    isFragile: false,
    handlingInstructions: "",
  });
  const [error, setError] = useState("");

  const setField = (key: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async () => {
    const details: DeliveryPackageDetails = {
      packageCount: Number(form.packageCount),
      totalWeightKg: Number(form.totalWeightKg),
      packageLengthCm: Number(form.packageLengthCm),
      packageWidthCm: Number(form.packageWidthCm),
      packageHeightCm: Number(form.packageHeightCm),
      sizeCategory: form.sizeCategory,
      isFragile: form.isFragile,
      handlingInstructions: form.handlingInstructions.trim(),
    };
    if (
      !Number.isInteger(details.packageCount) ||
      details.packageCount < 1 ||
      details.totalWeightKg <= 0 ||
      details.packageLengthCm <= 0 ||
      details.packageWidthCm <= 0 ||
      details.packageHeightCm <= 0
    ) {
      setError("Хайрцгийн тоо, жин болон гурван хэмжээг зөв оруулна уу.");
      return;
    }
    setError("");
    await onSubmit(details);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Хүргэлтэд бэлэн болгох
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              Баглаа боодлын мэдээлэл
            </h2>
            <p className="mt-1 font-mono text-xs text-slate-500">
              #{orderNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Цонх хаах"
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={21} />
          </button>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
            Энэ мэдээллээр тохирох хүргэгч, тээврийн хэрэгслийг сонгоно.
            Баталсны дараа хүргэлтийн ажил автоматаар үүснэ.
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              icon={Box}
              label="Хайрцаг / багцын тоо"
              value={form.packageCount}
              min="1"
              step="1"
              suffix="ш"
              onChange={(value) => setField("packageCount", value)}
            />
            <NumberField
              icon={Scale}
              label="Нийт жин"
              value={form.totalWeightKg}
              min="0.01"
              step="0.01"
              suffix="кг"
              onChange={(value) => setField("totalWeightKg", value)}
            />
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
              <Ruler size={16} className="text-indigo-600" />
              Нийт багцын гадна хэмжээ
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  ["packageLengthCm", "Урт"],
                  ["packageWidthCm", "Өргөн"],
                  ["packageHeightCm", "Өндөр"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-500">
                    {label}
                  </span>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0.01"
                      step="0.01"
                      value={form[key]}
                      onChange={(event) => setField(key, event.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 pr-9 text-sm font-bold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      см
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <fieldset>
            <legend className="mb-3 text-sm font-bold text-slate-800">
              Оворын ангилал
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SIZE_OPTIONS.map((option) => {
                const selected = form.sizeCategory === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setField("sizeCategory", option.value)}
                    className={`rounded-xl border p-3 text-left transition ${
                      selected
                        ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span className="block text-sm font-black text-slate-900">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-[11px] text-slate-500">
                      {option.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <span>
              <span className="block text-sm font-black text-amber-950">
                Эмзэг / хагарах бараа
              </span>
              <span className="mt-1 block text-xs text-amber-700">
                Хүргэгчид анхааруулга тод харагдана
              </span>
            </span>
            <input
              type="checkbox"
              checked={form.isFragile}
              onChange={(event) => setField("isFragile", event.target.checked)}
              className="h-5 w-5 rounded border-amber-300 text-indigo-600"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-bold text-slate-800">
              Зөөвөрлөх тусгай заавар
            </span>
            <textarea
              value={form.handlingInstructions}
              onChange={(event) =>
                setField("handlingInstructions", event.target.value)
              }
              maxLength={500}
              rows={3}
              placeholder="Жишээ: Босоогоор зөөнө, дээр нь бараа тавихгүй"
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
          </label>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Болих
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <PackageCheck size={17} />
              )}
              Хүргэлтийн ажил үүсгэх
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NumberField({
  icon: Icon,
  label,
  value,
  min,
  step,
  suffix,
  onChange,
}: {
  icon: typeof Box;
  label: string;
  value: string;
  min: string;
  step: string;
  suffix: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
        <Icon size={16} className="text-indigo-600" />
        {label}
      </span>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-11 text-sm font-bold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
          {suffix}
        </span>
      </div>
    </label>
  );
}
