"use client";

import {
  useId,
  type ComponentType,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import type { ContractPaymentAccount } from "./payment-account.model";

export const accountControlClass =
  "h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  description?: string;
};

export function AccountInput({
  label,
  value,
  onChange,
  required,
  description,
  ...inputProps
}: FieldProps &
  Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "onChange" | "value" | "required"
  >) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-slate-600"
    >
      <span>
        {label}
        {required && (
          <span className="ml-1 text-amber-600" aria-hidden="true">
            *
          </span>
        )}
      </span>
      <input
        {...inputProps}
        id={id}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className={accountControlClass}
        aria-describedby={description ? `${id}-hint` : undefined}
      />
      {description && (
        <span
          id={`${id}-hint`}
          className="text-xs font-normal leading-relaxed text-slate-500"
        >
          {description}
        </span>
      )}
    </label>
  );
}

export function AccountSelect({
  label,
  value,
  onChange,
  required,
  children,
  disabled,
  description,
}: FieldProps & { children: ReactNode; disabled?: boolean }) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-slate-600"
    >
      <span>
        {label}
        {required && (
          <span className="ml-1 text-amber-600" aria-hidden="true">
            *
          </span>
        )}
      </span>
      <select
        id={id}
        value={value}
        required={required}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={accountControlClass}
        aria-describedby={description ? `${id}-hint` : undefined}
      >
        {children}
      </select>
      {description && (
        <span
          id={`${id}-hint`}
          className="text-xs font-normal leading-relaxed text-slate-500"
        >
          {description}
        </span>
      )}
    </label>
  );
}

export function AccountFormSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {description}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

export type AccountFieldProps = {
  config: Partial<ContractPaymentAccount>;
  onChange: (field: string, value: string | boolean) => void;
};
export const bindAccountFields =
  ({ config, onChange }: AccountFieldProps) =>
  (key: keyof ContractPaymentAccount) => ({
    value: config[key] ?? "",
    onChange: (value: string) => onChange(key, value),
  });
