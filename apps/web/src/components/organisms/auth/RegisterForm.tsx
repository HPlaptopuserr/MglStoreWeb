"use client";

import { Check, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

type RegisterFormProps = {
  fullName: string;
  phone: string;
  password: string;
  confirmPassword: string;
  error?: string;
  loading: boolean;
  onFullNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

type FieldProps = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  autoComplete: string;
  onChange: (value: string) => void;
  inputMode?: "text" | "tel";
};

const fieldClassName =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50";

function TextField({
  id,
  label,
  value,
  placeholder,
  autoComplete,
  onChange,
  inputMode = "text",
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={fieldClassName}
      />
    </div>
  );
}

type PasswordFieldProps = Omit<FieldProps, "inputMode"> & {
  hint?: string;
  valid?: boolean;
};

function PasswordField({
  id,
  label,
  value,
  placeholder,
  autoComplete,
  onChange,
  hint,
  valid,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-xs font-bold text-slate-700">
          {label}
        </label>
        {hint && (
          <span className={`text-[11px] font-semibold ${valid ? "text-emerald-600" : "text-slate-400"}`}>
            {valid && <Check className="mr-1 inline h-3 w-3" />}
            {hint}
          </span>
        )}
      </div>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`${fieldClassName} pr-11`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label={visible ? `${label} нуух` : `${label} харах`}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function RegisterForm({
  fullName,
  phone,
  password,
  confirmPassword,
  error,
  loading,
  onFullNameChange,
  onPhoneChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}: RegisterFormProps) {
  const normalizedPhone = phone.replace(/\D/g, "");
  const passwordIsLongEnough = password.length >= 6;
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const formIsReady = useMemo(
    () =>
      fullName.trim().length > 0 &&
      normalizedPhone.length >= 8 &&
      passwordIsLongEnough &&
      passwordsMatch,
    [fullName, normalizedPhone.length, passwordIsLongEnough, passwordsMatch],
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-950">Утасны дугаараар бүртгүүлнэ</p>
            <p className="mt-0.5 text-xs leading-5 text-emerald-700">
              Мэдээллээ бөглөсний дараа Verify.mn-ээр дугаараа баталгаажуулна.
            </p>
          </div>
        </div>
      </div>

      <TextField
        id="register-full-name"
        label="Таны нэр"
        value={fullName}
        placeholder="Овог нэр"
        autoComplete="name"
        onChange={onFullNameChange}
      />

      <TextField
        id="register-phone"
        label="Утасны дугаар"
        value={phone}
        placeholder="9911 2233"
        autoComplete="tel"
        inputMode="tel"
        onChange={(value) => onPhoneChange(value.replace(/[^\d+\-()\s]/g, "").slice(0, 16))}
      />

      <PasswordField
        id="register-password"
        label="Нууц үг"
        value={password}
        placeholder="Дор хаяж 6 тэмдэгт"
        autoComplete="new-password"
        onChange={onPasswordChange}
        hint="6+ тэмдэгт"
        valid={passwordIsLongEnough}
      />

      <PasswordField
        id="register-confirm-password"
        label="Нууц үг давтах"
        value={confirmPassword}
        placeholder="Нууц үгээ дахин оруулна уу"
        autoComplete="new-password"
        onChange={onConfirmPasswordChange}
        hint={confirmPassword ? (passwordsMatch ? "Таарч байна" : "Таарахгүй байна") : undefined}
        valid={passwordsMatch}
      />

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-5 text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !formIsReady}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-200 transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        {loading ? "Баталгаажуулалт бэлдэж байна..." : "Үргэлжлүүлж утсаа баталгаажуулах"}
      </button>

      <p className="text-center text-[11px] leading-5 text-slate-400">
        Үргэлжлүүлснээр үйлчилгээний нөхцөл болон нууцлалын бодлогыг зөвшөөрсөнд тооцно.
      </p>
    </form>
  );
}
