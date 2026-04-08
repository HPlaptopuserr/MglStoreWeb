"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Warehouse,
  Loader2,
  ArrowLeft,
  Mail,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:4000";

type Step = "email" | "code" | "password" | "success";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Алдаа гарлаа.");
        return;
      }

      setStep("code");
    } catch {
      setError("Сервертэй холбогдож чадсангүй.");
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 3) {
      codeRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (pasted.length === 4) {
      setCode(pasted.split(""));
      codeRefs.current[3]?.focus();
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const fullCode = code.join("");

    if (fullCode.length !== 4) {
      setError("4 оронтой код оруулна уу.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/verify-reset-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: fullCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Код буруу байна.");
        return;
      }

      setStep("password");
    } catch {
      setError("Сервертэй холбогдож чадсангүй.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Нууц үг дор хаяж 6 тэмдэгт байх ёстой.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Нууц үг таарахгүй байна.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.join(""), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Алдаа гарлаа.");
        return;
      }

      setStep("success");
    } catch {
      setError("Сервертэй холбогдож чадсангүй.");
    } finally {
      setLoading(false);
    }
  };

  const stepConfig = {
    email: {
      title: "Нууц үг сэргээх",
      desc: "Бүртгэлтэй имэйл хаягаа оруулна уу.",
      icon: Mail,
    },
    code: {
      title: "Код баталгаажуулах",
      desc: `${email} хаяг руу илгээсэн 4 оронтой кодыг оруулна уу.`,
      icon: KeyRound,
    },
    password: {
      title: "Шинэ нууц үг",
      desc: "Шинэ нууц үгээ оруулна уу.",
      icon: Lock,
    },
    success: {
      title: "Амжилттай!",
      desc: "Нууц үг амжилттай шинэчлэгдлээ.",
      icon: CheckCircle2,
    },
  };

  const current = stepConfig[step];
  const StepIcon = current.icon;

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden w-[480px] flex-col justify-between bg-[#0f172a] p-10 lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
              <Warehouse className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">MGL WMS</span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Warehouse Management System
          </p>
        </div>

        <div>
          <h2 className="text-3xl font-black leading-tight text-white">
            Нууц үг
            <br />
            сэргээх
            <br />
            <span className="text-blue-400">хэсэг</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Имэйл хаягаар баталгаажуулах код авч, нууц үгээ шинэчилнэ үү.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-slate-400">
              Систем хэвийн ажиллаж байна
            </span>
          </div>
          <p className="text-[11px] text-slate-600">
            © {new Date().getFullYear()} MGL Store Platform
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
              <Warehouse className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">MGL WMS</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            {/* Step indicator */}
            {step !== "success" && (
              <div className="mb-6 flex items-center gap-2">
                {(["email", "code", "password"] as const).map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                        step === s
                          ? "bg-blue-600 text-white"
                          : (["email", "code", "password"].indexOf(step) > i)
                            ? "bg-blue-100 text-blue-600"
                            : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {i + 1}
                    </div>
                    {i < 2 && (
                      <div
                        className={`h-0.5 w-6 rounded ${
                          (["email", "code", "password"].indexOf(step) > i)
                            ? "bg-blue-200"
                            : "bg-slate-100"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  step === "success" ? "bg-emerald-100" : "bg-blue-100"
                }`}
              >
                <StepIcon
                  className={`h-5 w-5 ${
                    step === "success" ? "text-emerald-600" : "text-blue-600"
                  }`}
                />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900">
                  {current.title}
                </h1>
                <p className="text-sm text-slate-500">{current.desc}</p>
              </div>
            </div>

            {/* Step: Email */}
            {step === "email" && (
              <form onSubmit={handleForgotPassword} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Имэйл
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@warehouse.mn"
                    required
                    autoFocus
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Код авах"
                  )}
                </button>
              </form>
            )}

            {/* Step: Code */}
            {step === "code" && (
              <form onSubmit={handleVerifyCode} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    4 оронтой код
                  </label>
                  <div
                    className="flex justify-center gap-3"
                    onPaste={handleCodePaste}
                  >
                    {code.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { codeRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeChange(i, e.target.value)}
                        onKeyDown={(e) => handleCodeKeyDown(i, e)}
                        autoFocus={i === 0}
                        className="h-14 w-14 rounded-lg border border-slate-300 bg-white text-center text-2xl font-bold text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Баталгаажуулах"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setCode(["", "", "", ""]);
                    setError("");
                  }}
                  className="flex w-full items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Имэйл хаяг солих
                </button>
              </form>
            )}

            {/* Step: New Password */}
            {step === "password" && (
              <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Шинэ нууц үг
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Дор хаяж 6 тэмдэгт"
                      required
                      autoFocus
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 pr-10 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPw ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Нууц үг давтах
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPw ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Нууц үгээ дахин оруулна уу"
                      required
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 pr-10 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPw ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Нууц үг шинэчлэх"
                  )}
                </button>
              </form>
            )}

            {/* Step: Success */}
            {step === "success" && (
              <div className="mt-6 space-y-4">
                <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  Та шинэ нууц үгээрээ нэвтэрч болно.
                </div>

                <button
                  onClick={() => router.push("/login")}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Нэвтрэх хуудас руу буцах
                </button>
              </div>
            )}
          </div>

          {step !== "success" && (
            <p className="mt-4 text-center text-xs text-slate-400">
              <button
                onClick={() => router.push("/login")}
                className="text-blue-500 hover:text-blue-600 hover:underline"
              >
                Нэвтрэх хуудас руу буцах
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
