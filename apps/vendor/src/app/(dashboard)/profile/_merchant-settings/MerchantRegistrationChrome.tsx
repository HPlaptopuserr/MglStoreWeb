import { Check, CheckCircle2, X } from "lucide-react";

export interface RegistrationStepDefinition {
  title: string;
  description: string;
}

export function RegistrationSuccess({ onClose }: { onClose: () => void }) {
  const benefits = [
    "QR төлбөр идэвхтэй",
    "Данс баталгаажсан",
    "Касс ашиглахад бэлэн",
  ];

  return (
    <div className="flex min-h-[520px] flex-col items-center justify-center p-6 text-center sm:p-12">
      <div className="relative mb-7">
        <div className="absolute inset-0 animate-ping rounded-full bg-emerald-200 opacity-60" />
        <div className="relative grid h-24 w-24 place-items-center rounded-full bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50">
          <CheckCircle2 className="h-12 w-12" aria-hidden="true" />
        </div>
      </div>
      <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
        Бүртгэл амжилттай
      </span>
      <h2 className="mt-5 text-2xl font-black text-slate-950 sm:text-4xl">
        Minu Dynamic QR-д холбогдлоо
      </h2>
      <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
        Таны дэлгүүрийн мерчант бүртгэл амжилттай үүслээ. Одоо кассаасаа QR
        төлбөр хүлээн авч, орлогоо бүртгүүлсэн банкны дансандаа авах боломжтой.
      </p>
      <div className="mt-8 grid w-full max-w-xl gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-left sm:grid-cols-3">
        {benefits.map((label) => (
          <div
            key={label}
            className="flex items-center gap-2 text-xs font-bold text-emerald-800"
          >
            <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="mt-8 min-h-12 w-full max-w-sm rounded-xl bg-emerald-600 px-6 font-bold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-100"
      >
        Тохиргоо руу буцах
      </button>
    </div>
  );
}

export function RegistrationHeader({ onClose }: { onClose: () => void }) {
  return (
    <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-7 sm:py-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-600">
          Minu Dynamic QR
        </p>
        <h2
          id="merchant-registration-title"
          className="mt-1 text-xl font-black text-slate-950 sm:text-2xl"
        >
          Мерчант шинээр бүртгүүлэх
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Мэдээллээ алхам бүрээр хялбар бөглөнө үү.
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Бүртгэлийн цонх хаах"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-100"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </header>
  );
}

export function RegistrationProgress({
  steps,
  currentStep,
}: {
  steps: readonly RegistrationStepDefinition[];
  currentStep: number;
}) {
  const current = steps[currentStep];
  if (!current) return null;

  return (
    <div className="border-b border-slate-100 px-5 py-4 sm:px-7">
      <div className="hidden grid-cols-4 gap-3 sm:grid">
        {steps.map((step, index) => (
          <div key={step.title} className="min-w-0">
            <div
              className={`mb-2 h-1.5 rounded-full ${index <= currentStep ? "bg-indigo-600" : "bg-slate-200"}`}
            />
            <p
              className={`truncate text-xs font-bold ${index === currentStep ? "text-indigo-700" : index < currentStep ? "text-emerald-600" : "text-slate-400"}`}
            >
              {index < currentStep ? "✓ " : `${index + 1}. `}
              {step.title}
            </p>
          </div>
        ))}
      </div>
      <div className="sm:hidden">
        <div className="mb-2 flex items-center justify-between text-xs font-bold">
          <span className="text-indigo-700">{current.title}</span>
          <span className="text-slate-400">
            {currentStep + 1}/{steps.length}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
