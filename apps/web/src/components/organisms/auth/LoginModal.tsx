"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { User, Loader2, Mail, Phone, Lock, Eye, EyeOff, ArrowLeft, KeyRound, CheckCircle2, ShieldCheck } from "lucide-react";
import { API_BASE } from "@/lib/api";

type AuthTab = "login" | "register";
type AuthStep = "form" | "verifyMn";
type ForgotStep = "identifier" | "verifyMn" | "code" | "newPassword" | "done";

type VerifyMnSession = {
  sessionId: string;
  phone: string;
  shortcode: string;
  text: string;
  smsUri: string;
  displayInstruction: string;
  expiresAt: string;
};

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onLogin: (identifier: string, password: string) => Promise<void>;
  onRegister: (fullName: string, identifier: string, password: string) => Promise<void>;
  onStartVerifyMn?: (mode: AuthTab, identifier: string, password: string, fullName?: string) => Promise<VerifyMnSession>;
  onCompleteVerifyMn?: (mode: AuthTab, identifier: string, password: string, sessionId: string, fullName?: string) => Promise<void>;
  isLoading: boolean;
  error: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  open,
  onClose,
  onLogin,
  onRegister,
  onStartVerifyMn,
  onCompleteVerifyMn,
  isLoading,
  error,
}) => {
  const [tab, setTab] = useState<AuthTab>("login");
  const [authStep, setAuthStep] = useState<AuthStep>("form");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [localError, setLocalError] = useState("");
  const [verifyMnSession, setVerifyMnSession] = useState<VerifyMnSession | null>(null);
  const [verifyMnSnapshot, setVerifyMnSnapshot] = useState({
    mode: "login" as AuthTab,
    identifier: "",
    password: "",
    fullName: "",
  });
  const [verifyMnNow, setVerifyMnNow] = useState(() => Date.now());

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>("identifier");
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotCode, setForgotCode] = useState(["", "", "", ""]);
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotResetToken, setForgotResetToken] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showForgotConfirm, setShowForgotConfirm] = useState(false);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!verifyMnSession) return;

    setVerifyMnNow(Date.now());
    const timer = window.setInterval(() => {
      setVerifyMnNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [authStep, verifyMnSession]);

  const verifyMnRemainingSeconds = useMemo(() => {
    if (!verifyMnSession) return 0;
    return Math.max(0, Math.ceil((new Date(verifyMnSession.expiresAt).getTime() - verifyMnNow) / 1000));
  }, [verifyMnNow, verifyMnSession]);

  const verifyMnTimeText = useMemo(() => {
    const minutes = Math.floor(verifyMnRemainingSeconds / 60);
    const seconds = verifyMnRemainingSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [verifyMnRemainingSeconds]);

  if (!open) return null;

  const handleTabChange = (newTab: AuthTab) => {
    setTab(newTab);
    setAuthStep("form");
    setVerifyMnSession(null);
    setLocalError("");
  };

  const openForgot = () => {
    setShowForgot(true);
    setForgotStep("identifier");
    setForgotIdentifier("");
    setForgotCode(["", "", "", ""]);
    setForgotNewPassword("");
    setForgotConfirmPassword("");
    setForgotResetToken("");
    setForgotError("");
    setForgotLoading(false);
    setVerifyMnSession(null);
  };

  const closeForgot = () => {
    setShowForgot(false);
    setForgotError("");
    setVerifyMnSession(null);
    setForgotResetToken("");
  };

  const handleForgotSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    if (!forgotIdentifier.trim()) {
      setForgotError("И-мэйл эсвэл утасны дугаараа оруулна уу");
      return;
    }
    setForgotLoading(true);
    try {
      const isPhone = /^[0-9+\-\s()]{7,15}$/.test(forgotIdentifier.trim()) && !forgotIdentifier.includes("@");
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isPhone ? { phone: forgotIdentifier.trim() } : { email: forgotIdentifier.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Алдаа гарлаа");
      if (isPhone && data?.channel === "verifyMn" && data?.session) {
        setVerifyMnSession(data.session);
        setVerifyMnNow(Date.now());
        setForgotStep("verifyMn");
      } else {
        setForgotStep("code");
      }
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...forgotCode];
    newCode[index] = value.slice(-1);
    setForgotCode(newCode);
    if (value && index < 3) {
      codeRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !forgotCode[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleForgotVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    const code = forgotCode.join("");
    if (code.length < 4) {
      setForgotError("4 оронтой кодыг бүрэн оруулна уу");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/verify-reset-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Код буруу байна");
      setForgotStep("newPassword");
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotVerifyMnComplete = async () => {
    setForgotError("");
    if (!verifyMnSession) {
      setForgotError("Verify.mn баталгаажуулалт эхлээгүй байна.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password/verify-mn/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: forgotIdentifier.trim(),
          sessionId: verifyMnSession.sessionId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Verify.mn баталгаажуулахад алдаа гарлаа");
      setForgotResetToken(data.resetToken || "");
      setVerifyMnSession(null);
      setForgotStep("newPassword");
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    if (forgotNewPassword.length < 6) {
      setForgotError("Нууц үг дор хаяж 6 тэмдэгт байх ёстой");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("Нууц үгүүд таарахгүй байна");
      return;
    }
    setForgotLoading(true);
    try {
      const code = forgotCode.join("");
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: forgotResetToken ? undefined : code,
          resetToken: forgotResetToken || undefined,
          password: forgotNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Алдаа гарлаа");
      setForgotStep("done");
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!identifier.trim() || !password.trim()) {
      setLocalError("Утас/и-мэйл болон нууц үгээ оруулна уу.");
      return;
    }

    try {
      await onLogin(identifier, password);
      setIdentifier("");
      setPassword("");
      setRememberMe(false);
    } catch {
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!identifier.trim() || !password.trim() || !fullName.trim() || !confirmPassword.trim()) {
      setLocalError("Бүх талбарыг бөглөнө үү.");
      return;
    }

    if (password !== confirmPassword) {
      setLocalError("Нууц үгүүд таарахгүй байна.");
      return;
    }

    if (password.length < 6) {
      setLocalError("Нууц үг дор хаяж 6 тэмдэгт байх ёстой.");
      return;
    }

    try {
      await onRegister(fullName, identifier, password);
      setIdentifier("");
      setPassword("");
      setConfirmPassword("");
      setFullName("");
    } catch {
    }
  };

  const handleVerifyMnComplete = async () => {
    setLocalError("");
    if (!verifyMnSession || !onCompleteVerifyMn) {
      setLocalError("Verify.mn баталгаажуулалт эхлээгүй байна.");
      return;
    }

    try {
      await onCompleteVerifyMn(
        verifyMnSnapshot.mode,
        verifyMnSnapshot.identifier,
        verifyMnSnapshot.password,
        verifyMnSession.sessionId,
        verifyMnSnapshot.fullName,
      );
      setIdentifier("");
      setPassword("");
      setConfirmPassword("");
      setFullName("");
      setRememberMe(false);
      setVerifyMnSession(null);
      setAuthStep("form");
    } catch {
    }
  };

  const displayError = localError || error;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="Close login modal"
      />

      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl shadow-2xl">
        <div className="grid md:grid-cols-2 bg-white">
          <div className="p-6 sm:p-8 flex flex-col justify-center">
            {showForgot ? (
              /* ── Forgot Password Flow ─────────────────────────── */
              <div>
                <button
                  type="button"
                  onClick={forgotStep === "done" ? closeForgot : forgotStep === "identifier" ? closeForgot : () => setForgotStep(forgotStep === "code" ? "identifier" : forgotStep === "newPassword" ? "code" : "identifier")}
                  className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
                >
                  <ArrowLeft size={16} />
                  {forgotStep === "identifier" || forgotStep === "done" ? "Нэвтрэх рүү буцах" : "Буцах"}
                </button>

                {forgotStep === "identifier" && (
                  <form onSubmit={handleForgotSendCode} className="space-y-4">
                    <div className="text-center mb-2">
                      <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                        <KeyRound size={28} className="text-amber-500" />
                      </div>
                      <h2 className="text-xl font-black text-gray-900">Нууц үг сэргээх</h2>
                      <p className="text-sm text-gray-500 mt-1">Бүртгэлтэй и-мэйл эсвэл утасны дугаараа оруулна уу</p>
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
                        И-мэйл эсвэл утас
                      </label>
                      <input
                        type="text"
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        placeholder="name@mail.com эсвэл 99112233"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
                        autoFocus
                      />
                    </div>
                    {forgotError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {forgotError}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:shadow-lg hover:from-amber-600 hover:to-orange-700 disabled:opacity-70"
                    >
                      {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                      {forgotLoading ? "Илгээж байна..." : "Код илгээх"}
                    </button>
                  </form>
                )}

                {forgotStep === "verifyMn" && verifyMnSession && (
                  <div className="space-y-4">
                    <div className="text-center mb-2">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck size={28} className="text-blue-500" />
                      </div>
                      <h2 className="text-xl font-black text-gray-900">Утас баталгаажуулах</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Доорх SMS-г илгээсний дараа шалгах товчийг дарна уу.
                      </p>
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div className="mb-4 flex items-center justify-between rounded-lg bg-white px-3 py-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Үлдсэн хугацаа</span>
                        <span className={`text-sm font-black ${verifyMnRemainingSeconds > 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {verifyMnRemainingSeconds > 0 ? verifyMnTimeText : "Дууссан"}
                        </span>
                      </div>
                      <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Илгээх дугаар</p>
                      <p className="mt-1 text-2xl font-black text-gray-900">{verifyMnSession.shortcode}</p>
                      <p className="mt-4 text-xs font-bold uppercase tracking-wide text-amber-700">SMS текст</p>
                      <p className="mt-1 rounded-lg bg-white px-3 py-2 text-base font-bold text-gray-900">
                        {verifyMnSession.text}
                      </p>
                    </div>

                    {verifyMnRemainingSeconds > 0 ? (
                      <a
                        href={verifyMnSession.smsUri}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-gray-800"
                      >
                        <Phone className="h-4 w-4" />
                        SMS илгээх
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setForgotStep("identifier");
                          setVerifyMnSession(null);
                          setForgotError("");
                        }}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-gray-800"
                      >
                        Дахин эхлүүлэх
                      </button>
                    )}

                    {forgotError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {forgotError}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleForgotVerifyMnComplete}
                      disabled={forgotLoading || verifyMnRemainingSeconds <= 0}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:shadow-lg hover:from-amber-600 hover:to-orange-700 disabled:opacity-70"
                    >
                      {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      {forgotLoading ? "Шалгаж байна..." : "Баталгаажуулалт шалгах"}
                    </button>
                  </div>
                )}

                {forgotStep === "code" && (
                  <form onSubmit={handleForgotVerifyCode} className="space-y-4">
                    <div className="text-center mb-2">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck size={28} className="text-blue-500" />
                      </div>
                      <h2 className="text-xl font-black text-gray-900">Баталгаажуулах код</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        <span className="font-medium text-gray-700">{forgotIdentifier}</span> руу илгээсэн 4 оронтой кодыг оруулна уу
                      </p>
                    </div>
                    <div className="flex justify-center gap-3">
                      {forgotCode.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => { codeRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleCodeChange(i, e.target.value)}
                          onKeyDown={(e) => handleCodeKeyDown(i, e)}
                          className="w-14 h-14 text-center text-2xl font-bold rounded-xl border border-gray-200 bg-gray-50 outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
                          autoFocus={i === 0}
                        />
                      ))}
                    </div>
                    {forgotError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {forgotError}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:shadow-lg hover:from-amber-600 hover:to-orange-700 disabled:opacity-70"
                    >
                      {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {forgotLoading ? "Шалгаж байна..." : "Баталгаажуулах"}
                    </button>
                  </form>
                )}

                {forgotStep === "newPassword" && (
                  <form onSubmit={handleForgotResetPassword} className="space-y-4">
                    <div className="text-center mb-2">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                        <Lock size={28} className="text-emerald-500" />
                      </div>
                      <h2 className="text-xl font-black text-gray-900">Шинэ нууц үг</h2>
                      <p className="text-sm text-gray-500 mt-1">Шинэ нууц үгээ оруулна уу</p>
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
                        Шинэ нууц үг
                      </label>
                      <div className="relative">
                        <input
                          type={showForgotPassword ? "text" : "password"}
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-10 text-sm outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
                          autoFocus
                        />
                        <button type="button" onClick={() => setShowForgotPassword(!showForgotPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showForgotPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
                        Нууц үг давтах
                      </label>
                      <div className="relative">
                        <input
                          type={showForgotConfirm ? "text" : "password"}
                          value={forgotConfirmPassword}
                          onChange={(e) => setForgotConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-10 text-sm outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
                        />
                        <button type="button" onClick={() => setShowForgotConfirm(!showForgotConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showForgotConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    {forgotError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {forgotError}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:shadow-lg hover:from-amber-600 hover:to-orange-700 disabled:opacity-70"
                    >
                      {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                      {forgotLoading ? "Хадгалж байна..." : "Нууц үг шинэчлэх"}
                    </button>
                  </form>
                )}

                {forgotStep === "done" && (
                  <div className="text-center space-y-4 py-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                      <CheckCircle2 size={36} className="text-emerald-500" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900">Амжилттай!</h2>
                    <p className="text-sm text-gray-500">Нууц үг амжилттай шинэчлэгдлээ. Одоо шинэ нууц үгээрээ нэвтрэх боломжтой.</p>
                    <button
                      type="button"
                      onClick={closeForgot}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:shadow-lg hover:from-amber-600 hover:to-orange-700"
                    >
                      Нэвтрэх рүү буцах
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* ── Login / Register Tabs ─────────────────────────── */
              <>
            {authStep === "verifyMn" && verifyMnSession ? (
              <div className="space-y-5">
                <button
                  type="button"
                  onClick={() => {
                    setAuthStep("form");
                    setVerifyMnSession(null);
                    setLocalError("");
                  }}
                  className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ArrowLeft size={16} />
                  Буцах
                </button>

                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck size={28} className="text-blue-500" />
                  </div>
                  <h2 className="text-xl font-black text-gray-900">Утас баталгаажуулах</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Доорх SMS-г илгээсний дараа шалгах товчийг дарна уу.
                  </p>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="mb-4 flex items-center justify-between rounded-lg bg-white px-3 py-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Үлдсэн хугацаа</span>
                    <span className={`text-sm font-black ${verifyMnRemainingSeconds > 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {verifyMnRemainingSeconds > 0 ? verifyMnTimeText : "Дууссан"}
                    </span>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Илгээх дугаар</p>
                  <p className="mt-1 text-2xl font-black text-gray-900">{verifyMnSession.shortcode}</p>
                  <p className="mt-4 text-xs font-bold uppercase tracking-wide text-amber-700">SMS текст</p>
                  <p className="mt-1 rounded-lg bg-white px-3 py-2 text-base font-bold text-gray-900">
                    {verifyMnSession.text}
                  </p>
                </div>

                {verifyMnRemainingSeconds > 0 ? (
                  <a
                    href={verifyMnSession.smsUri}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-gray-800"
                  >
                    <Phone className="h-4 w-4" />
                    SMS илгээх
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthStep("form");
                      setVerifyMnSession(null);
                      setLocalError("");
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-gray-800"
                  >
                    Дахин эхлүүлэх
                  </button>
                )}

                {displayError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {displayError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleVerifyMnComplete}
                  disabled={isLoading || verifyMnRemainingSeconds <= 0}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:shadow-lg hover:from-amber-600 hover:to-orange-700 disabled:opacity-70"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  {isLoading ? "Шалгаж байна..." : "Баталгаажуулалт шалгах"}
                </button>
              </div>
            ) : (
              <>
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">//</span>
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-gray-600">
                  MGL Store
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
                {tab === "login" ? "Нэвтрэх" : "Шинэ бүртгүүлээ"}
              </h2>
            </div>

            <div className="flex gap-2 mb-6 border-b border-gray-200">
              <button
                onClick={() => handleTabChange("login")}
                className={`pb-3 px-4 text-sm font-bold transition-colors ${
                  tab === "login"
                    ? "border-b-2 border-amber-500 text-amber-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Нэвтрэх
              </button>
              <button
                onClick={() => handleTabChange("register")}
                className={`pb-3 px-4 text-sm font-bold transition-colors ${
                  tab === "register"
                    ? "border-b-2 border-amber-500 text-amber-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Бүртгүүлэх
              </button>
            </div>

            {/* Forms */}
            {tab === "login" ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
                    И-мэйл эсвэл утас
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="name@mail.com эсвэл 99112233"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
                    Нууц үг
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-10 text-sm outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="remember"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-amber-500 cursor-pointer"
                    />
                    <label htmlFor="remember" className="ml-2 text-sm text-gray-700 cursor-pointer">
                      Намайг санах
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={openForgot}
                    className="text-sm font-medium text-amber-600 hover:text-amber-500 transition-colors"
                  >
                    Нууц үгээ мартсан?
                  </button>
                </div>

                {displayError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {displayError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:shadow-lg hover:from-amber-600 hover:to-orange-700 disabled:opacity-70"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                  {isLoading ? "Шалгаж байна..." : "Нэвтрэх"}
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-500">эсвэл</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.372 0 0 5.373 0 12s5.372 12 12 12 12-5.373 12-12S18.628 0 12 0zm0 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" />
                    </svg>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
                    Нэр
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Таны нэрийг оруулна уу"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
                    И-мэйл эсвэл утас
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="name@mail.com эсвэл 99112233"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
                    Нууц үг
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-10 text-sm outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
                    Нууц үгээ баталгаажуулна уу
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-10 text-sm outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {displayError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {displayError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:shadow-lg hover:from-amber-600 hover:to-orange-700 disabled:opacity-70"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                  {isLoading ? "Бүртгүүлж байна..." : "Бүртгүүлэх"}
                </button>
              </form>
            )}
              </>
            )}
              </>
            )}
          </div>

          <div className="hidden md:flex flex-col justify-center items-center p-8 bg-gradient-to-br from-amber-600 via-orange-500 to-red-500 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 right-10 w-40 h-40 rounded-full border border-white/20" />
              <div className="absolute bottom-10 left-10 w-32 h-32 rounded-full border border-white/20" />
            </div>

            <div className="relative z-10 text-center">
              <h3 className="text-2xl font-black mb-4">
                Хэрэглэгчид юу хэлдэг вэ?
              </h3>

              <div className="mb-6 text-lg leading-relaxed">
                <p className="text-white/90 mb-4">
                  "Энэ платформ маш сайхан, энгийн интерфейс байна. Миний бизнесийн нүүхээ асар сайн өгсөн."
                </p>
                <p className="font-semibold">— Мөнх Баатар</p>
                <p className="text-sm text-white/70">MGL Store-ын дүрслэлтэнэр</p>
              </div>

              <div className="flex items-center justify-center gap-3">
                <div className="w-2 h-2 rounded-full bg-white/60" />
                <div className="w-2 h-2 rounded-full bg-white" />
                <div className="w-2 h-2 rounded-full bg-white/60" />
              </div>

              <div className="mt-8 pt-8 border-t border-white/20">
                <p className="text-sm text-white/80 mb-4">Бидэнтэй нийтлэгдэх</p>
                <div className="flex justify-center gap-4">
                  <button className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center">
                    <span className="text-xs font-bold">f</span>
                  </button>
                  <button className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center">
                    <span className="text-xs font-bold">𝕏</span>
                  </button>
                  <button className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center">
                    <span className="text-xs font-bold">in</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onClose}
        className="absolute top-4 right-4 md:top-8 md:right-8 text-gray-500 hover:text-gray-700 z-[80] md:hidden"
        aria-label="Close"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
