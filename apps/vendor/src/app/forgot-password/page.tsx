"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Step = "identifier" | "code" | "password" | "success";

export default function VendorForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState(["", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!identifier.trim()) {
      setError("И-мэйл эсвэл утасны дугаараа оруулна уу.");
      return;
    }

    setLoading(true);
    try {
      const isPhone =
        /^[0-9+\-\s()]{7,15}$/.test(identifier.trim()) &&
        !identifier.includes("@");

      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isPhone
            ? { phone: identifier.trim() }
            : { email: identifier.trim().toLowerCase() }
        ),
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

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 4);
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

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white flex-col justify-between p-16 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="w-full h-full fill-current text-amber-500"
          >
            <polygon points="0,100 100,0 100,100" />
          </svg>
        </div>

        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold tracking-tight mb-4">
            MGL<span className="text-amber-500">STORE</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-md">
            Үндэсний үйлдвэрлэгч, нийлүүлэгчдийн нэгдсэн экосистем.
          </p>
        </div>

        <div className="relative z-10">
          <h2 className="text-3xl font-black leading-tight">
            Нууц үг
            <br />
            сэргээх
            <br />
            <span className="text-amber-500">хэсэг</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            И-мэйл эсвэл утасны дугаараар баталгаажуулах код авч, нууц үгээ
            шинэчилнэ үү.
          </p>
        </div>

        <div className="relative z-10 space-y-3">
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

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-slate-100">
          {/* Step indicator */}
          {step !== "success" && (
            <div className="flex items-center justify-center gap-2">
              {(["identifier", "code", "password"] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                      step === s
                        ? "bg-amber-500 text-white"
                        : ["identifier", "code", "password"].indexOf(step) > i
                          ? "bg-amber-100 text-amber-600"
                          : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {i + 1}
                  </div>
                  {i < 2 && (
                    <div
                      className={`h-0.5 w-8 rounded ${
                        ["identifier", "code", "password"].indexOf(step) > i
                          ? "bg-amber-200"
                          : "bg-slate-100"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Step: Identifier */}
          {step === "identifier" && (
            <>
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Нууц үг сэргээх
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Бүртгэлтэй и-мэйл эсвэл утасны дугаараа оруулна уу.
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleSendCode}>
                {error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm font-medium border border-red-100">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    И-мэйл эсвэл утасны дугаар
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors bg-slate-50 focus:bg-white text-slate-900"
                    placeholder="vendor@company.mn эсвэл 9911xxxx"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    "Код илгээх"
                  )}
                </button>
              </form>
            </>
          )}

          {/* Step: Code */}
          {step === "code" && (
            <>
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Код баталгаажуулах
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  <span className="font-medium text-slate-700">{identifier}</span> руу илгээсэн 4 оронтой кодыг оруулна уу.
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleVerifyCode}>
                {error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm font-medium border border-red-100">
                    {error}
                  </div>
                )}

                <div className="flex justify-center gap-3" onPaste={handleCodePaste}>
                  {code.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        codeRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(i, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(i, e)}
                      autoFocus={i === 0}
                      className="w-14 h-14 text-center text-2xl font-bold rounded-xl border border-slate-200 bg-slate-50 outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    "Баталгаажуулах"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("identifier");
                    setCode(["", "", "", ""]);
                    setError("");
                  }}
                  className="w-full text-center text-sm text-slate-500 hover:text-slate-700 transition-colors"
                >
                  ← Буцах
                </button>
              </form>
            </>
          )}

          {/* Step: New Password */}
          {step === "password" && (
            <>
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Шинэ нууц үг
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Шинэ нууц үгээ оруулна уу.
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleResetPassword}>
                {error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm font-medium border border-red-100">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Шинэ нууц үг
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors bg-slate-50 focus:bg-white text-slate-900"
                      placeholder="Дор хаяж 6 тэмдэгт"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPw ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Нууц үг давтах
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPw ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors bg-slate-50 focus:bg-white text-slate-900"
                      placeholder="Нууц үгээ дахин оруулна уу"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirmPw ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    "Нууц үг шинэчлэх"
                  )}
                </button>
              </form>
            </>
          )}

          {/* Step: Success */}
          {step === "success" && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Амжилттай!</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Нууц үг амжилттай шинэчлэгдлээ. Одоо шинэ нууц үгээрээ нэвтрэх боломжтой.
                </p>
              </div>
              <button
                onClick={() => router.push("/login")}
                className="w-full flex justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all"
              >
                Нэвтрэх хуудас руу буцах
              </button>
            </div>
          )}

          {step !== "success" && (
            <p className="text-center text-sm text-slate-500 mt-4">
              <a
                href="/login"
                className="font-bold text-slate-900 hover:text-amber-600 transition-colors"
              >
                Нэвтрэх хуудас руу буцах
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
