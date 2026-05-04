"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { VerifyMnPanel, type VerifyMnSession } from "./VerifyMnPanel";

type ForgotStep = "identifier" | "verifyMn" | "emailOtp" | "newPassword" | "done";

type ApiPayload = {
  message?: string;
  channel?: string;
  session?: VerifyMnSession;
  resetToken?: string;
  challengeToken?: string;
  emailMasked?: string;
  expiresIn?: number;
};

async function readApiPayload(res: Response): Promise<ApiPayload> {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json().catch(() => ({}));
  }
  await res.text().catch(() => "");
  return { message: "Серверээс буруу хариу ирлээ." };
}

export type ForgotPasswordFlowProps = {
  apiBase: string;
  onDone: () => void;
  onBack?: () => void;
};

export function ForgotPasswordFlow({ apiBase, onDone, onBack }: ForgotPasswordFlowProps) {
  const [step, setStep] = useState<ForgotStep>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [emailOtpChallenge, setEmailOtpChallenge] = useState<ApiPayload | null>(null);
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [emailOtpExpiresAt, setEmailOtpExpiresAt] = useState(0);
  const [emailOtpNow, setEmailOtpNow] = useState(() => Date.now());
  const [verifyMnSession, setVerifyMnSession] = useState<VerifyMnSession | null>(null);
  const [verifyMnNow, setVerifyMnNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!verifyMnSession) return;
    setVerifyMnNow(Date.now());
    const timer = window.setInterval(() => setVerifyMnNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [verifyMnSession]);

  useEffect(() => {
    if (!emailOtpChallenge) return;
    setEmailOtpNow(Date.now());
    const timer = window.setInterval(() => setEmailOtpNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [emailOtpChallenge]);

  const verifyMnRemainingSeconds = useMemo(() => {
    if (!verifyMnSession) return 0;
    return Math.max(0, Math.ceil((new Date(verifyMnSession.expiresAt).getTime() - verifyMnNow) / 1000));
  }, [verifyMnSession, verifyMnNow]);

  const verifyMnTimeText = useMemo(() => {
    const m = Math.floor(verifyMnRemainingSeconds / 60);
    const s = verifyMnRemainingSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, [verifyMnRemainingSeconds]);

  const emailOtpRemainingSeconds = useMemo(() => {
    if (!emailOtpChallenge || !emailOtpExpiresAt) return 0;
    return Math.max(0, Math.ceil((emailOtpExpiresAt - emailOtpNow) / 1000));
  }, [emailOtpChallenge, emailOtpExpiresAt, emailOtpNow]);

  const emailOtpTimeText = useMemo(() => {
    const m = Math.floor(emailOtpRemainingSeconds / 60);
    const s = emailOtpRemainingSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, [emailOtpRemainingSeconds]);

  const goBack = () => {
    if (step === "identifier" || step === "done") {
      onBack ? onBack() : onDone();
      return;
    }
    setStep("identifier");
    setVerifyMnSession(null);
    setResetToken("");
    setEmailOtpChallenge(null);
    setEmailOtpCode("");
    setEmailOtpExpiresAt(0);
    setError("");
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const value = identifier.trim();
    const isPhone = /^[0-9+\-\s()]{7,16}$/.test(value) && !value.includes("@");
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (!isPhone && !isEmail) {
      setError("Бүртгэлтэй и-мэйл эсвэл утасны дугаараа оруулна уу.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isPhone ? { phone: value } : { email: value.toLowerCase() }),
      });
      const data = await readApiPayload(res);

      if (res.ok && data.channel === "emailOtp" && data.challengeToken) {
        setEmailOtpChallenge(data);
        setEmailOtpCode("");
        setEmailOtpExpiresAt(Date.now() + (data.expiresIn || 600) * 1000);
        setEmailOtpNow(Date.now());
        setStep("emailOtp");
        return;
      }
      if (!res.ok) throw new Error(data.message || "Баталгаажуулалт эхлүүлэхэд алдаа гарлаа.");
      if (!data.session) throw new Error(data.message || "Verify.mn баталгаажуулалт эхлүүлэхэд алдаа гарлаа.");

      setVerifyMnSession(data.session);
      setVerifyMnNow(Date.now());
      setStep("verifyMn");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMnComplete = async () => {
    if (!verifyMnSession) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/auth/forgot-password/verify-mn/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: identifier.trim(), sessionId: verifyMnSession.sessionId }),
      });
      const data = await readApiPayload(res);
      if (!res.ok) throw new Error(data.message || "Verify.mn баталгаажуулахад алдаа гарлаа.");
      if (!data.resetToken) throw new Error("Нууц үг шинэчлэх эрх үүссэнгүй. Дахин оролдоно уу.");

      setResetToken(data.resetToken);
      setVerifyMnSession(null);
      setStep("newPassword");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!emailOtpChallenge?.challengeToken) {
      setError("Баталгаажуулах хүсэлт олдсонгүй. Дахин оролдоно уу.");
      return;
    }
    if (!/^\d{6}$/.test(emailOtpCode.trim())) {
      setError("6 оронтой баталгаажуулах кодоо оруулна уу.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/auth/forgot-password/email/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otpCode: emailOtpCode.trim(),
          challengeToken: emailOtpChallenge.challengeToken,
        }),
      });
      const data = await readApiPayload(res);
      if (!res.ok) throw new Error(data.message || "Имэйл код баталгаажуулахад алдаа гарлаа.");
      if (!data.resetToken) throw new Error("Нууц үг шинэчлэх эрх үүссэнгүй. Дахин оролдоно уу.");

      setResetToken(data.resetToken);
      setEmailOtpChallenge(null);
      setEmailOtpCode("");
      setEmailOtpExpiresAt(0);
      setStep("newPassword");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError("Нууц үг дор хаяж 6 тэмдэгт байх ёстой.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Нууц үгүүд таарахгүй байна.");
      return;
    }
    if (!resetToken) {
      setError("Баталгаажуулалт дууссангүй. Дахин оролдоно уу.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, password: newPassword }),
      });
      const data = await readApiPayload(res);
      if (!res.ok) throw new Error(data.message || "Нууц үг шинэчлэхэд алдаа гарлаа.");
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {step !== "done" && (
        <button
          type="button"
          onClick={goBack}
          className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700"
        >
          <ArrowLeft size={16} />
          {step === "identifier" ? "Нэвтрэх рүү буцах" : "Буцах"}
        </button>
      )}

      {step === "identifier" && (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div className="mb-2 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
              <KeyRound size={28} className="text-amber-500" />
            </div>
            <h2 className="text-xl font-black text-gray-900">Нууц үг сэргээх</h2>
            <p className="mt-1 text-sm text-gray-500">
              Бүртгэлтэй и-мэйл эсвэл утасны дугаараа оруулна уу.
            </p>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
              И-мэйл эсвэл утасны дугаар
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="name@example.com эсвэл 99112233"
              autoFocus
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
            />
          </div>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:from-amber-600 hover:to-orange-700 hover:shadow-lg disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {loading ? "Эхлүүлж байна..." : "Баталгаажуулалт эхлүүлэх"}
          </button>
        </form>
      )}

      {step === "verifyMn" && verifyMnSession && (
        <VerifyMnPanel
          session={verifyMnSession}
          remainingSeconds={verifyMnRemainingSeconds}
          timeText={verifyMnTimeText}
          loading={loading}
          error={error}
          onRestart={() => {
            setStep("identifier");
            setVerifyMnSession(null);
            setError("");
          }}
          onVerify={handleVerifyMnComplete}
        />
      )}

      {step === "emailOtp" && emailOtpChallenge && (
        <form onSubmit={handleEmailOtpSubmit} className="space-y-4">
          <div className="mb-2 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
              <ShieldCheck size={28} className="text-amber-500" />
            </div>
            <h2 className="text-xl font-black text-gray-900">Имэйл баталгаажуулах</h2>
            <p className="mt-1 text-sm text-gray-500">
              {emailOtpChallenge.emailMasked || identifier} хаяг руу илгээсэн 6 оронтой кодыг оруулна уу.
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Код хүчинтэй хугацаа: <span className="font-bold">{emailOtpTimeText}</span>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
              Баталгаажуулах код
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={emailOtpCode}
              onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              autoFocus
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-lg font-bold tracking-[0.35em] outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
            />
          </div>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || emailOtpRemainingSeconds <= 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:from-amber-600 hover:to-orange-700 hover:shadow-lg disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {loading ? "Шалгаж байна..." : "Код баталгаажуулах"}
          </button>
        </form>
      )}

      {step === "newPassword" && (
        <form onSubmit={handleResetPassword} className="space-y-4">
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
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-10 text-sm outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showNewPassword ? "Нууц үг нуух" : "Нууц үг харах"}
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
              Нууц үг давтах
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
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showConfirmPassword ? "Нууц үг нуух" : "Нууц үг харах"}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:from-amber-600 hover:to-orange-700 hover:shadow-lg disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {loading ? "Хадгалж байна..." : "Нууц үг шинэчлэх"}
          </button>
        </form>
      )}

      {step === "done" && (
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
            onClick={onDone}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3.5 text-sm font-bold text-white transition-all hover:from-amber-600 hover:to-orange-700 hover:shadow-lg"
          >
            Нэвтрэх рүү буцах
          </button>
        </div>
      )}
    </div>
  );
}
