import { Check } from "lucide-react";

export function EmployeeAssignmentSteps({ step }: { step: 1 | 2 }) {
  return (
    <ol
      aria-label="Ажилтан нэмэх алхмууд"
      className="mb-6 flex items-center gap-3 text-xs font-semibold"
    >
      {(["Хэрэглэгч сонгох", "Ажил оноох"] as const).map((label, index) => (
        <li
          key={label}
          aria-current={step === index + 1 ? "step" : undefined}
          className={`flex flex-1 items-center gap-2 ${step >= index + 1 ? "text-blue-700" : "text-slate-400"}`}
        >
          <span
            className={`flex size-6 shrink-0 items-center justify-center rounded-full ${step >= index + 1 ? "bg-blue-600 text-white" : "bg-slate-100"}`}
          >
            {step > index + 1 ? (
              <Check className="size-3.5" aria-hidden="true" />
            ) : (
              index + 1
            )}
          </span>
          {label}
          {index === 0 && (
            <span
              className="ml-1 h-px flex-1 bg-slate-200"
              aria-hidden="true"
            />
          )}
        </li>
      ))}
    </ol>
  );
}
