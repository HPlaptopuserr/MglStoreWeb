"use client";

import React, { useEffect, useMemo, useState } from "react";
import { User, Loader2, Lock, Eye, EyeOff, ArrowLeft, KeyRound, CheckCircle2, ShieldCheck } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { RegisterForm } from "./RegisterForm";
import { VerifyMnPanel, type VerifyMnSession } from "./VerifyMnPanel";

type AuthTab = "login" | "register";
type ForgotStep = "identifier" | "verifyMn" | "emailOtp" | "newPassword" | "done";
type LoginResult = {
  requiresEmailOtp?: boolean;
  challengeToken?: string;
  emailMasked?: string;
  expiresIn?: number;
};

export type LoginMarketingBanner = {
  imageUrl?: string;
  eyebrow?: string;
  title?: string;
  quote?: string;
  author?: string;
  role?: string;
  cta?: string;
  href?: string;
  socialLinks?: {
    facebook?: string;
    x?: string;
    linkedin?: string;
  };
};

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onLogin: (
    identifier: string,
    password: string,
    options?: { otpCode?: string; challengeToken?: string },
  ) => Promise<LoginResult | void>;
  onRegister: (
    fullName: string,
    identifier: string,
    password: string,
    options?: { verifyMnSessionId?: string },
  ) => Promise<void>;
  isLoading: boolean;
  error: string;
  marketingBanner?: LoginMarketingBanner | null;
}

type ApiPayload = {
  message?: string;
  channel?: string;
  session?: VerifyMnSession;
  resetToken?: string;
  challengeToken?: string;
  emailMasked?: string;
  expiresIn?: number;
};

const FRIENDLY_API_ERROR = "Серверээс буруу хариу ирлээ. API тохиргоогоо шалгаад дахин оролдоно уу.";

async function readApiPayload(res: Response): Promise<ApiPayload> {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json().catch(() => ({}));
  }

  await res.text().catch(() => "");
  return { message: FRIENDLY_API_ERROR };
}

function isVerifyMnSession(value: unknown): value is VerifyMnSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<VerifyMnSession>;
  return Boolean(candidate.sessionId && candidate.shortcode && candidate.text && candidate.smsUri);
}

export const LoginModal: React.FC<LoginModalProps> = ({
  open,
  onClose,
  onLogin,
  onRegister,
  isLoading,
  error,
  marketingBanner,
}) => {
  useLockBodyScroll();

  const [tab, setTab] = useState<AuthTab>("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [localError, setLocalError] = useState("");
  const [loginOtpChallenge, setLoginOtpChallenge] = useState<LoginResult | null>(null);
  const [loginOtpCode, setLoginOtpCode] = useState("");
  const [loginOtpExpiresAt, setLoginOtpExpiresAt] = useState(0);
  const [loginOtpNow, setLoginOtpNow] = useState(() => Date.now());
  const [verifyMnSession, setVerifyMnSession] = useState<VerifyMnSession | null>(null);
  const [verifyMnNow, setVerifyMnNow] = useState(() => Date.now());
  const [registerVerifySession, setRegisterVerifySession] = useState<VerifyMnSession | null>(null);
  const [registerVerifyNow, setRegisterVerifyNow] = useState(() => Date.now());
  const [registerVerifyLoading, setRegisterVerifyLoading] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>("identifier");
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotResetToken, setForgotResetToken] = useState("");
  const [forgotEmailOtpChallenge, setForgotEmailOtpChallenge] = useState<ApiPayload | null>(null);
  const [forgotEmailOtpCode, setForgotEmailOtpCode] = useState("");
  const [forgotEmailOtpExpiresAt, setForgotEmailOtpExpiresAt] = useState(0);
  const [forgotEmailOtpNow, setForgotEmailOtpNow] = useState(() => Date.now());
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showForgotConfirm, setShowForgotConfirm] = useState(false);

  useEffect(() => {
    if (!verifyMnSession) return;

    setVerifyMnNow(Date.now());
    const timer = window.setInterval(() => {
      setVerifyMnNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [verifyMnSession]);

  useEffect(() => {
    if (!loginOtpChallenge) return;

    setLoginOtpNow(Date.now());
    const timer = window.setInterval(() => {
      setLoginOtpNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [loginOtpChallenge]);

  useEffect(() => {
    if (!registerVerifySession) return;

    setRegisterVerifyNow(Date.now());
    const timer = window.setInterval(() => {
      setRegisterVerifyNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [registerVerifySession]);

  useEffect(() => {
    if (!forgotEmailOtpChallenge) return;

    setForgotEmailOtpNow(Date.now());
    const timer = window.setInterval(() => {
      setForgotEmailOtpNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [forgotEmailOtpChallenge]);

  const verifyMnRemainingSeconds = useMemo(() => {
    if (!verifyMnSession) return 0;
    return Math.max(0, Math.ceil((new Date(verifyMnSession.expiresAt).getTime() - verifyMnNow) / 1000));
  }, [verifyMnNow, verifyMnSession]);

  const verifyMnTimeText = useMemo(() => {
    const minutes = Math.floor(verifyMnRemainingSeconds / 60);
    const seconds = verifyMnRemainingSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [verifyMnRemainingSeconds]);

  const registerVerifyRemainingSeconds = useMemo(() => {
    if (!registerVerifySession) return 0;
    return Math.max(
      0,
      Math.ceil((new Date(registerVerifySession.expiresAt).getTime() - registerVerifyNow) / 1000),
    );
  }, [registerVerifyNow, registerVerifySession]);

  const registerVerifyTimeText = useMemo(() => {
    const minutes = Math.floor(registerVerifyRemainingSeconds / 60);
    const seconds = registerVerifyRemainingSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [registerVerifyRemainingSeconds]);

  const loginOtpRemainingSeconds = useMemo(() => {
    if (!loginOtpChallenge || !loginOtpExpiresAt) return 0;
    return Math.max(0, Math.ceil((loginOtpExpiresAt - loginOtpNow) / 1000));
  }, [loginOtpChallenge, loginOtpExpiresAt, loginOtpNow]);

  const loginOtpTimeText = useMemo(() => {
    const minutes = Math.floor(loginOtpRemainingSeconds / 60);
    const seconds = loginOtpRemainingSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [loginOtpRemainingSeconds]);

  const forgotEmailOtpRemainingSeconds = useMemo(() => {
    if (!forgotEmailOtpChallenge || !forgotEmailOtpExpiresAt) return 0;
    return Math.max(0, Math.ceil((forgotEmailOtpExpiresAt - forgotEmailOtpNow) / 1000));
  }, [forgotEmailOtpChallenge, forgotEmailOtpExpiresAt, forgotEmailOtpNow]);

  const forgotEmailOtpTimeText = useMemo(() => {
    const minutes = Math.floor(forgotEmailOtpRemainingSeconds / 60);
    const seconds = forgotEmailOtpRemainingSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [forgotEmailOtpRemainingSeconds]);

  if (!open) return null;

  const handleTabChange = (newTab: AuthTab) => {
    setTab(newTab);
    setVerifyMnSession(null);
    setRegisterVerifySession(null);
    setRegisterVerifyLoading(false);
    setLoginOtpChallenge(null);
    setLoginOtpCode("");
    setLoginOtpExpiresAt(0);
    setLocalError("");
  };

  const openForgot = () => {
    setShowForgot(true);
    setForgotStep("identifier");
    setForgotIdentifier("");
    setForgotNewPassword("");
    setForgotConfirmPassword("");
    setForgotResetToken("");
    setForgotEmailOtpChallenge(null);
    setForgotEmailOtpCode("");
    setForgotEmailOtpExpiresAt(0);
    setForgotError("");
    setForgotLoading(false);
    setVerifyMnSession(null);
    setRegisterVerifySession(null);
    setRegisterVerifyLoading(false);
    setShowForgotPassword(false);
    setShowForgotConfirm(false);
  };

  const closeForgot = () => {
    setShowForgot(false);
    setForgotError("");
    setVerifyMnSession(null);
    setForgotResetToken("");
    setForgotEmailOtpChallenge(null);
    setForgotEmailOtpCode("");
    setForgotEmailOtpExpiresAt(0);
  };

  const backFromForgot = () => {
    if (forgotStep === "identifier" || forgotStep === "done") {
      closeForgot();
      return;
    }

    setForgotStep("identifier");
    setVerifyMnSession(null);
    setForgotResetToken("");
    setForgotEmailOtpChallenge(null);
    setForgotEmailOtpCode("");
    setForgotEmailOtpExpiresAt(0);
    setForgotError("");
  };

  const handleForgotSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");

    const value = forgotIdentifier.trim();
    const isPhone = /^[0-9+\-\s()]{7,16}$/.test(value) && !value.includes("@");
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (!isPhone && !isEmail) {
      setForgotError("Бүртгэлтэй и-мэйл эсвэл утасны дугаараа оруулна уу.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isPhone ? { phone: value } : { email: value.toLowerCase() }),
      });
      const data = await readApiPayload(res);
      if (res.ok && data.channel === "emailOtp" && data.challengeToken) {
        setForgotEmailOtpChallenge(data);
        setForgotEmailOtpCode("");
        setForgotEmailOtpExpiresAt(Date.now() + (data.expiresIn || 600) * 1000);
        setForgotEmailOtpNow(Date.now());
        setForgotStep("emailOtp");
        return;
      }
      if (!res.ok) throw new Error(data.message || "Verify.mn баталгаажуулалт эхлүүлэхэд алдаа гарлаа.");
      if (!data.session) throw new Error(data.message || "Verify.mn баталгаажуулалт эхлүүлэхэд алдаа гарлаа.");

      setVerifyMnSession(data.session);
      setVerifyMnNow(Date.now());
      setForgotStep("verifyMn");
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : "Алдаа гарлаа.");
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
      const data = await readApiPayload(res);
      if (!res.ok) throw new Error(data.message || "Verify.mn баталгаажуулахад алдаа гарлаа.");
      if (!data.resetToken) throw new Error("Нууц үг шинэчлэх эрх үүссэнгүй. Дахин оролдоно уу.");

      setForgotResetToken(data.resetToken);
      setVerifyMnSession(null);
      setForgotStep("newPassword");
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : "Алдаа гарлаа.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotEmailOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");

    if (!forgotEmailOtpChallenge?.challengeToken) {
      setForgotError("Баталгаажуулах хүсэлт олдсонгүй. Дахин оролдоно уу.");
      return;
    }

    if (!/^\d{6}$/.test(forgotEmailOtpCode.trim())) {
      setForgotError("6 оронтой баталгаажуулах кодоо оруулна уу.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password/email/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otpCode: forgotEmailOtpCode.trim(),
          challengeToken: forgotEmailOtpChallenge.challengeToken,
        }),
      });
      const data = await readApiPayload(res);
      if (!res.ok) throw new Error(data.message || "Имэйл код баталгаажуулахад алдаа гарлаа.");
      if (!data.resetToken) throw new Error("Нууц үг шинэчлэх эрх үүссэнгүй. Дахин оролдоно уу.");

      setForgotResetToken(data.resetToken);
      setForgotEmailOtpChallenge(null);
      setForgotEmailOtpCode("");
      setForgotEmailOtpExpiresAt(0);
      setForgotStep("newPassword");
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : "Алдаа гарлаа.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    if (forgotNewPassword.length < 6) {
      setForgotError("Нууц үг дор хаяж 6 тэмдэгт байх ёстой.");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("Нууц үгүүд таарахгүй байна.");
      return;
    }
    if (!forgotResetToken) {
      setForgotError("Баталгаажуулалт дууссангүй. Утасны баталгаажуулалтаа дахин хийнэ үү.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetToken: forgotResetToken,
          password: forgotNewPassword,
        }),
      });
      const data = await readApiPayload(res);
      if (!res.ok) throw new Error(data.message || "Нууц үг шинэчлэхэд алдаа гарлаа.");

      setForgotStep("done");
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : "Алдаа гарлаа.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    setLoginOtpChallenge(null);
    setLoginOtpCode("");

    if (!identifier.trim() || !password.trim()) {
      setLocalError("Утас/и-мэйл болон нууц үгээ оруулна уу.");
      return;
    }

    try {
      const result = await onLogin(identifier, password);
      if (result?.requiresEmailOtp) {
        setLoginOtpChallenge(result);
        setLoginOtpCode("");
        setLoginOtpExpiresAt(Date.now() + (result.expiresIn || 600) * 1000);
        setLoginOtpNow(Date.now());
        return;
      }
      setIdentifier("");
      setPassword("");
      setRememberMe(false);
    } catch {
    }
  };

  const handleLoginOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!loginOtpChallenge?.challengeToken) {
      setLocalError("Баталгаажуулах хүсэлт олдсонгүй. Дахин нэвтэрнэ үү.");
      return;
    }

    if (!/^\d{6}$/.test(loginOtpCode.trim())) {
      setLocalError("6 оронтой баталгаажуулах кодоо оруулна уу.");
      return;
    }

    try {
      await onLogin(identifier, password, {
        otpCode: loginOtpCode.trim(),
        challengeToken: loginOtpChallenge.challengeToken,
      });
      setIdentifier("");
      setPassword("");
      setLoginOtpCode("");
      setLoginOtpChallenge(null);
      setLoginOtpExpiresAt(0);
      setRememberMe(false);
    } catch {
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    setRegisterVerifySession(null);

    if (!identifier.trim() || !password.trim() || !fullName.trim() || !confirmPassword.trim()) {
      setLocalError("Бүх талбарыг бөглөнө үү.");
      return;
    }

    const phone = identifier.trim();
    const isPhone = /^[0-9+\-\s()]{7,16}$/.test(phone) && !phone.includes("@");
    if (!isPhone) {
      setLocalError("Бүртгэл үүсгэхдээ утасны дугаараа оруулж Verify.mn баталгаажуулна уу.");
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

    setRegisterVerifyLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/web/verify-mn/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          password,
          fullName: fullName.trim(),
          mode: "register",
        }),
      });
      const data = await readApiPayload(res);
      if (!res.ok) throw new Error(data.message || "Verify.mn баталгаажуулалт эхлүүлэхэд алдаа гарлаа.");

      const session = data.session || (isVerifyMnSession(data) ? data : null);
      if (!session) throw new Error(data.message || "Verify.mn баталгаажуулалт эхлүүлэхэд алдаа гарлаа.");

      setRegisterVerifySession(session);
      setRegisterVerifyNow(Date.now());
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Баталгаажуулалт эхлүүлэхэд алдаа гарлаа.");
    } finally {
      setRegisterVerifyLoading(false);
    }
  };

  const handleRegisterVerifyComplete = async () => {
    setLocalError("");
    if (!registerVerifySession) {
      setLocalError("Verify.mn баталгаажуулалт эхлээгүй байна.");
      return;
    }

    setRegisterVerifyLoading(true);
    try {
      await onRegister(fullName, identifier, password, {
        verifyMnSessionId: registerVerifySession.sessionId,
      });
      setIdentifier("");
      setPassword("");
      setConfirmPassword("");
      setFullName("");
      setRegisterVerifySession(null);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Verify.mn баталгаажуулахад алдаа гарлаа.");
    } finally {
      setRegisterVerifyLoading(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden overscroll-none p-3 sm:p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="Нэвтрэх цонх хаах"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={tab === "login" ? "Нэвтрэх" : "Шинэ бүртгэл"}
        className="relative z-10 max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)]"
      >
        <div className="grid max-h-[inherit] bg-white md:grid-cols-2">
          <div className="flex max-h-[inherit] flex-col overflow-y-auto p-5 sm:p-8 md:justify-center">
            {showForgot ? (
              <div>
                <button
                  type="button"
                  onClick={backFromForgot}
                  className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700"
                >
                  <ArrowLeft size={16} />
                  {forgotStep === "identifier" || forgotStep === "done" ? "Нэвтрэх рүү буцах" : "Буцах"}
                </button>

                {forgotStep === "identifier" && (
                  <form onSubmit={handleForgotSendCode} className="space-y-4">
                    <div className="mb-2 text-center">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
                        <KeyRound size={28} className="text-amber-500" />
                      </div>
                      <h2 className="text-xl font-black text-gray-900">Нууц үг сэргээх</h2>
                      <p className="mt-1 text-sm text-gray-500">Бүртгэлтэй и-мэйл эсвэл утасны дугаараа оруулна уу.</p>
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
                        И-мэйл эсвэл утасны дугаар
                      </label>
                      <input
                        type="text"
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        placeholder="name@example.com эсвэл 99112233"
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
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:from-amber-600 hover:to-orange-700 hover:shadow-lg disabled:opacity-70"
                    >
                      {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                      {forgotLoading ? "Эхлүүлж байна..." : "Баталгаажуулалт эхлүүлэх"}
                    </button>
                  </form>
                )}

                {forgotStep === "verifyMn" && verifyMnSession && (
                  <VerifyMnPanel
                    session={verifyMnSession}
                    remainingSeconds={verifyMnRemainingSeconds}
                    timeText={verifyMnTimeText}
                    loading={forgotLoading}
                    error={forgotError}
                    onRestart={() => {
                      setForgotStep("identifier");
                      setVerifyMnSession(null);
                      setForgotError("");
                    }}
                    onVerify={handleForgotVerifyMnComplete}
                  />
                )}

                {forgotStep === "emailOtp" && forgotEmailOtpChallenge && (
                  <form onSubmit={handleForgotEmailOtpSubmit} className="space-y-4">
                    <div className="mb-2 text-center">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
                        <ShieldCheck size={28} className="text-amber-500" />
                      </div>
                      <h2 className="text-xl font-black text-gray-900">Имэйл баталгаажуулах</h2>
                      <p className="mt-1 text-sm text-gray-500">
                        {forgotEmailOtpChallenge.emailMasked || forgotIdentifier} хаяг руу илгээсэн 6 оронтой кодыг оруулна уу.
                      </p>
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      Код хүчинтэй хугацаа: <span className="font-bold">{forgotEmailOtpTimeText}</span>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
                        Баталгаажуулах код
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={forgotEmailOtpCode}
                        onChange={(e) => setForgotEmailOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="123456"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-lg font-bold tracking-[0.35em] outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
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
                      disabled={forgotLoading || forgotEmailOtpRemainingSeconds <= 0}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:from-amber-600 hover:to-orange-700 hover:shadow-lg disabled:opacity-70"
                    >
                      {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      {forgotLoading ? "Шалгаж байна..." : "Код баталгаажуулах"}
                    </button>
                  </form>
                )}

                {forgotStep === "newPassword" && (
                  <form onSubmit={handleForgotResetPassword} className="space-y-4">
                    <div className="mb-2 text-center">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
                        <Lock size={28} className="text-emerald-500" />
                      </div>
                      <h2 className="text-xl font-black text-gray-900">Шинэ нууц үг</h2>
                      <p className="mt-1 text-sm text-gray-500">Шинэ нууц үгээ оруулна уу.</p>
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
                        />
                        <button
                          type="button"
                          onClick={() => setShowForgotPassword(!showForgotPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          aria-label={showForgotPassword ? "Нууц үг нуух" : "Нууц үг харах"}
                        >
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
                        <button
                          type="button"
                          onClick={() => setShowForgotConfirm(!showForgotConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          aria-label={showForgotConfirm ? "Нууц үг нуух" : "Нууц үг харах"}
                        >
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
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:from-amber-600 hover:to-orange-700 hover:shadow-lg disabled:opacity-70"
                    >
                      {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                      {forgotLoading ? "Хадгалж байна..." : "Нууц үг шинэчлэх"}
                    </button>
                  </form>
                )}

                {forgotStep === "done" && (
                  <div className="space-y-4 py-4 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                      <CheckCircle2 size={36} className="text-emerald-500" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900">Амжилттай!</h2>
                    <p className="text-sm text-gray-500">
                      Нууц үг амжилттай шинэчлэгдлээ. Одоо шинэ нууц үгээрээ нэвтрэх боломжтой.
                    </p>
                    <button
                      type="button"
                      onClick={closeForgot}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:from-amber-600 hover:to-orange-700 hover:shadow-lg"
                    >
                      Нэвтрэх рүү буцах
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 shadow-sm">
                      <span className="text-sm font-bold text-white">{"//"}</span>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">MGL Store</span>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    {tab === "login" ? "Нэвтрэх" : "Шинэ бүртгэл"}
                  </h2>
                  <p className="mt-1.5 text-sm text-slate-500">
                    {tab === "login"
                      ? "Бүртгэлтэй хаягаараа үргэлжлүүлнэ үү."
                      : "Хэдхэн алхмаар бүртгэлээ аюулгүй үүсгээрэй."}
                  </p>
                </div>

                <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Нэвтрэх сонголт">
                  <button
                    type="button"
                    onClick={() => handleTabChange("login")}
                    role="tab"
                    aria-selected={tab === "login"}
                    className={`rounded-lg px-4 py-2.5 text-sm font-bold transition-all ${
                      tab === "login"
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Нэвтрэх
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange("register")}
                    role="tab"
                    aria-selected={tab === "register"}
                    className={`rounded-lg px-4 py-2.5 text-sm font-bold transition-all ${
                      tab === "register"
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Бүртгүүлэх
                  </button>
                </div>

                {tab === "login" ? (
                  loginOtpChallenge ? (
                    <form onSubmit={handleLoginOtpSubmit} className="space-y-4">
                      <div className="mb-2 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
                          <ShieldCheck size={28} className="text-amber-500" />
                        </div>
                        <h2 className="text-xl font-black text-gray-900">Имэйл баталгаажуулах</h2>
                        <p className="mt-1 text-sm text-gray-500">
                          {loginOtpChallenge.emailMasked || identifier} хаяг руу илгээсэн 6 оронтой кодыг оруулна уу.
                        </p>
                      </div>

                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        Код хүчинтэй хугацаа: <span className="font-bold">{loginOtpTimeText}</span>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
                          Баталгаажуулах код
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={loginOtpCode}
                          onChange={(e) => setLoginOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="123456"
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-lg font-bold tracking-[0.35em] outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
                          autoFocus
                        />
                      </div>

                      {displayError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                          {displayError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isLoading || loginOtpRemainingSeconds <= 0}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:from-amber-600 hover:to-orange-700 hover:shadow-lg disabled:opacity-70"
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                        {isLoading ? "Шалгаж байна..." : "Код баталгаажуулах"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLoginOtpChallenge(null);
                          setLoginOtpCode("");
                          setLoginOtpExpiresAt(0);
                          setLocalError("");
                        }}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        Буцах
                      </button>
                    </form>
                  ) : (
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
                          aria-label={showPassword ? "Нууц үг нуух" : "Нууц үг харах"}
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
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 text-amber-500"
                        />
                        <label htmlFor="remember" className="ml-2 cursor-pointer text-sm text-gray-700">
                          Намайг санах
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={openForgot}
                        className="text-sm font-medium text-amber-600 transition-colors hover:text-amber-500"
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
                      disabled={registerVerifyLoading || isLoading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:from-amber-600 hover:to-orange-700 hover:shadow-lg disabled:opacity-70"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <User className="h-4 w-4" />}
                      {isLoading ? "Шалгаж байна..." : "Нэвтрэх"}
                    </button>

                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-gray-200" />
                      <span className="text-xs text-gray-500">эсвэл</span>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>

                    <div className="flex gap-3">
                      {["○", "●", "●"].map((label, index) => (
                        <button
                          key={index}
                          type="button"
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                          aria-label={`Нэвтрэх сонголт ${index + 1}`}
                        >
                          <span className="text-base leading-none">{label}</span>
                        </button>
                      ))}
                    </div>
                  </form>
                  )
                ) : registerVerifySession ? (
                  <VerifyMnPanel
                    session={registerVerifySession}
                    remainingSeconds={registerVerifyRemainingSeconds}
                    timeText={registerVerifyTimeText}
                    loading={registerVerifyLoading || isLoading}
                    error={displayError}
                    onRestart={() => {
                      setRegisterVerifySession(null);
                      setRegisterVerifyLoading(false);
                      setLocalError("");
                    }}
                    onVerify={handleRegisterVerifyComplete}
                  />
                ) : (
                  <RegisterForm
                    fullName={fullName}
                    phone={identifier}
                    password={password}
                    confirmPassword={confirmPassword}
                    error={displayError}
                    loading={registerVerifyLoading || isLoading}
                    onFullNameChange={setFullName}
                    onPhoneChange={setIdentifier}
                    onPasswordChange={setPassword}
                    onConfirmPasswordChange={setConfirmPassword}
                    onSubmit={handleRegisterSubmit}
                  />
                )}
              </>
            )}
          </div>

          <LoginMarketingPanel banner={marketingBanner} />
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-[80] text-gray-500 hover:text-gray-700 md:right-8 md:top-8 md:hidden"
        aria-label="Хаах"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

function LoginMarketingPanel({ banner }: { banner?: LoginMarketingBanner | null }) {
  const resolved = {
    imageUrl: banner?.imageUrl || "",
    eyebrow: banner?.eyebrow || "MGL Store",
    title: banner?.title || "Хэрэглэгчид юу хэлдэг вэ?",
    quote:
      banner?.quote ||
      "Энэ платформ маш ойлгомжтой, энгийн интерфейстэй. Миний бизнесийн онлайн борлуулалтад их тус болсон.",
    author: banner?.author || "Мөнх Баатар",
    role: banner?.role || "MGL Store хэрэглэгч",
    cta: banner?.cta || "Бидэнтэй нэгдэх",
    href: banner?.href || "/",
    socialLinks: banner?.socialLinks || {},
  };
  const socials = [
    { label: "f", href: resolved.socialLinks.facebook, name: "Facebook" },
    { label: "X", href: resolved.socialLinks.x, name: "X" },
    { label: "in", href: resolved.socialLinks.linkedin, name: "LinkedIn" },
  ].filter((item) => item.href);

  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-amber-600 via-orange-500 to-red-500 p-8 text-white md:flex">
      {resolved.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={resolved.imageUrl} alt={resolved.title} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 opacity-10">
          <div className="absolute right-10 top-10 h-40 w-40 rounded-full border border-white/20" />
          <div className="absolute bottom-10 left-10 h-32 w-32 rounded-full border border-white/20" />
        </div>
      )}
      <div className={`absolute inset-0 ${resolved.imageUrl ? "bg-gradient-to-t from-slate-950/82 via-slate-950/30 to-slate-950/15" : "bg-transparent"}`} />

      <div className="relative z-10">
        <span className="inline-flex max-w-full rounded-2xl bg-white/16 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/85 backdrop-blur-sm">
          <span className="truncate">{resolved.eyebrow}</span>
        </span>
        <h3 className="mt-8 text-3xl font-black leading-tight">{resolved.title}</h3>
      </div>

      <div className="relative z-10 text-center">
        <p className="mx-auto max-w-md text-xl font-semibold leading-9 text-white/90">
          &ldquo;{resolved.quote}&rdquo;
        </p>
        <p className="mt-8 text-lg font-black">{resolved.author}</p>
        <p className="mt-1 text-sm font-semibold text-white/70">{resolved.role}</p>
      </div>

      <div className="relative z-10 border-t border-white/20 pt-7 text-center">
        <a href={resolved.href} className="text-sm font-bold text-white/85 transition hover:text-white">
          {resolved.cta}
        </a>
        {socials.length > 0 && (
          <div className="mt-4 flex justify-center gap-4">
            {socials.map((item) => (
              <a
                key={item.name}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-xs font-bold transition-colors hover:bg-white/30"
                aria-label={`${item.name} холбоос`}
              >
                {item.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
