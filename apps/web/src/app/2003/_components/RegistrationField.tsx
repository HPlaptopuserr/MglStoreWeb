import type { InputHTMLAttributes } from "react";

interface RegistrationFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
}

export function RegistrationField({
  label,
  name,
  required,
  ...props
}: RegistrationFieldProps) {
  return (
    <label className="block text-sm font-medium text-slate-700" htmlFor={name}>
      {label}{" "}
      {required && (
        <span className="text-orange-600" aria-hidden="true">
          *
        </span>
      )}
      <input
        {...props}
        id={name}
        name={name}
        required={required}
        maxLength={160}
        className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:opacity-60"
      />
    </label>
  );
}
