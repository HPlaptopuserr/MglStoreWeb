"use client";

import type { ReactNode } from "react";

type FormFieldProps = {
  id: string;
  label: string;
  error?: string;
  helper?: string;
  children: ReactNode;
};

export function FormField({ id, label, error, helper, children }: FormFieldProps) {
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold text-slate-800">
        {label}
      </label>
      {children}
      {error ? (
        <p id={errorId} className="text-sm font-medium text-rose-600">
          {error}
        </p>
      ) : helper ? (
        <p id={helperId} className="text-sm text-slate-500">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
