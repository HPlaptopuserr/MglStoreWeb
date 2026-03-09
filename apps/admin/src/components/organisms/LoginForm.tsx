"use client";

import { useState } from "react";
import { ShieldCheck, LogIn, Eye, EyeOff } from "lucide-react";
import { FormField } from "../molecules/FormField";
import { AlertMessage } from "../molecules/AlertMessage";
import { Button } from "../atoms/Button";

export interface LoginFormProps {
  onSubmit?: (email: string, password: string) => Promise<void> | void;
  isLoading?: boolean;
  error?: string;
  title?: string;
  subtitle?: string;
}

export function LoginForm({
  onSubmit,
  isLoading = false,
  error = "",
  title = "Нэвтрэх",
  subtitle = "Мэдээллээ оруулж системд нэвтэрнэ үү.",
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      await onSubmit(email, password);
    }
  };

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-6">
          <div className="bg-[#5B4CFF] text-white p-3 rounded-2xl flex items-center justify-center">
            <ShieldCheck className="w-8 h-8" aria-hidden="true" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">{title}</h1>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>

      {error && <AlertMessage message={error} type="error" className="mb-6" />}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <FormField
          label="Имэйл хаяг"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.mn"
          required
          autoComplete="email"
        />

        <div className="relative">
          <FormField
            label="Нууц үг"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />

          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-9 text-slate-500 hover:text-slate-700"
            aria-label={showPassword ? "Нууц үг нуух" : "Нууц үг харах"}
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            isLoading={isLoading}
            loadingText="Түр хүлээнэ үү..."
            icon={<LogIn className="w-5 h-5" aria-hidden="true" />}
          >
            Нэвтрэх
          </Button>
        </div>
      </form>
    </div>
  );
}
