"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import "./password-input.css";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function PasswordInput({ id, disabled, ...props }: PasswordInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  const label = visible ? "Нууц үг нуух" : "Нууц үг харах";
  return (
    <div className="business-password">
      <input {...props} id={inputId} disabled={disabled} type={visible ? "text" : "password"} />
      <button type="button" className="business-password-toggle" aria-label={label} aria-controls={inputId} aria-pressed={visible} title={label} disabled={disabled} onClick={() => setVisible(value => !value)}>
        {visible ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
      </button>
    </div>
  );
}
