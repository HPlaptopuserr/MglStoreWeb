"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { API_BASE } from "@/lib/api";
import { addSession, type AdminUser } from "@/lib/admin-auth";

type ForgotStep = "identifier" | "verifyMn" | "emailOtp" | "newPassword" | "done";

type VerifyMnSession = {
  sessionId: string;
  phone: string;
  shortcode: string;
  text: string;
  smsUri: string;
  displayInstruction: string;
  expiresAt: string;
};

type ApiPayload = {
  message?: string;
  channel?: string;
  session?: VerifyMnSession;
  resetToken?: string;
  challengeToken?: string;
  emailMasked?: string;
  expiresIn?: number;
  accessToken?: string;
  user?: AdminUser;
};

async function readApiPayload(res: Response): Promise<ApiPayload> {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json().catch(() => ({}));
  }

  await res.text().catch(() => "");
  return { message: "Серверээс буруу хариу ирлээ. API тохиргоогоо шалгана уу." };
}

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>("identifier");
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [verifyMnSession, setVerifyMnSession] = useState<VerifyMnSession | null>(null);
  const [verifyMnNow, setVerifyMnNow] = useState(() => Date.now());
  const [emailOtpChallenge, setEmailOtpChallenge] = useState<ApiPayload | null>(null);
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [emailOtpExpiresAt, setEmailOtpExpiresAt] = useState(0);
  const [emailOtpNow, setEmailOtpNow] = useState(() => Date.now());
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const router = useRouter();

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
  }, [verifyMnNow, verifyMnSession]);

  const verifyMnTimeText = useMemo(() => {
    const minutes = Math.floor(verifyMnRemainingSeconds / 60);
    const seconds = verifyMnRemainingSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [verifyMnRemainingSeconds]);

  const emailOtpRemainingSeconds = useMemo(() => {
    if (!emailOtpChallenge || !emailOtpExpiresAt) return 0;
    return Math.max(0, Math.ceil((emailOtpExpiresAt - emailOtpNow) / 1000));
  }, [emailOtpChallenge, emailOtpExpiresAt, emailOtpNow]);

  const emailOtpTimeText = useMemo(() => {
    const minutes = Math.floor(emailOtpRemainingSeconds / 60);
    const seconds = emailOtpRemainingSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [emailOtpRemainingSeconds]);

  const resetForgotState = () => {
    setForgotStep("identifier");
    setForgotIdentifier("");
    setVerifyMnSession(null);
    setEmailOtpChallenge(null);
    setEmailOtpCode("");
    setEmailOtpExpiresAt(0);
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    setCopied(false);
    setError("");
  };

  const openForgot = () => {
    resetForgotState();
    setShowForgot(true);
  };

  const backFromForgot = () => {
    if (forgotStep === "identifier" || forgotStep === "done") {
      resetForgotState();
      setShowForgot(false);
      return;
    }

    setForgotStep("identifier");
    setVerifyMnSession(null);
    setEmailOtpChallenge(null);
    setEmailOtpCode("");
    setEmailOtpExpiresAt(0);
    setResetToken("");
    setError("");
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!email || !password) {
      setError("Имэйл болон нууц үгээ бүрэн оруулна уу.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await readApiPayload(res);
      if (!res.ok || !data.accessToken || !data.user) {
        throw new Error(data.message || "Нэвтрэх эрх татгалзагдлаа.");
      }

      localStorage.setItem("admin_token", data.accessToken);
      localStorage.setItem("admin_user", JSON.stringify(data.user));
      addSession(data.accessToken, data.user);

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Нэвтрэх нэр эсвэл нууц үг буруу байна");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSendCode = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const value = forgotIdentifier.trim();
    const isPhone = /^[0-9+\-\s()]{7,16}$/.test(value) && !value.includes("@");
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (!isPhone && !isEmail) {
      setError("Admin бүртгэлтэй имэйл эсвэл утасны дугаараа оруулна уу.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/admin/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isPhone ? { phone: value } : { email: value.toLowerCase() }),
      });
      const data = await readApiPayload(res);

      if (!res.ok) {
        throw new Error(data.message || "Баталгаажуулалт эхлүүлэхэд алдаа гарлаа.");
      }

      if (data.channel === "emailOtp" && data.challengeToken) {
        setEmailOtpChallenge(data);
        setEmailOtpCode("");
        setEmailOtpExpiresAt(Date.now() + (data.expiresIn || 600) * 1000);
        setEmailOtpNow(Date.now());
        setForgotStep("emailOtp");
        return;
      }

      if (!data.session) {
        throw new Error(data.message || "Verify.mn баталгаажуулалт эхлүүлэхэд алдаа гарлаа.");
      }

      setVerifyMnSession(data.session);
      setVerifyMnNow(Date.now());
      setForgotStep("verifyMn");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyMnComplete = async () => {
    setError("");
    if (!verifyMnSession) {
      setError("Verify.mn баталгаажуулалт эхлээгүй байна.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/admin/forgot-password/verify-mn/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: forgotIdentifier.trim(),
          sessionId: verifyMnSession.sessionId,
        }),
      });
      const data = await readApiPayload(res);
      if (!res.ok || !data.resetToken) {
        throw new Error(data.message || "Verify.mn баталгаажуулахад алдаа гарлаа.");
      }

      setResetToken(data.resetToken);
      setVerifyMnSession(null);
      setForgotStep("newPassword");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailOtpSubmit = async (e: FormEvent) => {
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

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/admin/forgot-password/email/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otpCode: emailOtpCode.trim(),
          challengeToken: emailOtpChallenge.challengeToken,
        }),
      });
      const data = await readApiPayload(res);
      if (!res.ok || !data.resetToken) {
        throw new Error(data.message || "Имэйл код баталгаажуулахад алдаа гарлаа.");
      }

      setResetToken(data.resetToken);
      setEmailOtpChallenge(null);
      setEmailOtpCode("");
      setEmailOtpExpiresAt(0);
      setForgotStep("newPassword");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
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
      setError("Баталгаажуулалт дуусаагүй байна. Дахин оролдоно уу.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetToken,
          password: newPassword,
        }),
      });
      const data = await readApiPayload(res);
      if (!res.ok) {
        throw new Error(data.message || "Нууц үг шинэчлэхэд алдаа гарлаа.");
      }

      setForgotStep("done");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySmsText = async () => {
    if (!verifyMnSession) return;

    try {
      await navigator.clipboard.writeText(verifyMnSession.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const renderPasswordInput = (
    id: string,
    value: string,
    onChange: (value: string) => void,
    visible: boolean,
    setVisible: (value: boolean) => void,
    placeholder = "••••••••",
  ) => (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={isLoading}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-slate-900 transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500"
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
        aria-label={visible ? "Нууц үг нуух" : "Нууц үг харах"}
      >
        {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );

  const renderForgotContent = () => {
    if (forgotStep === "identifier") {
      return (
        <form className="mt-8 space-y-6" onSubmit={handleForgotSendCode}>
          <div className="text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
              <KeyRound className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Нууц үг сэргээх</h2>
            <p className="mt-2 text-sm text-slate-500">
              Admin бүртгэлтэй имэйл эсвэл утасны дугаараа оруулна уу.
            </p>
          </div>

          {error && <ErrorMessage message={error} />}

          <div>
            <label htmlFor="forgotIdentifier" className="mb-1 block text-sm font-medium text-slate-700">
              Имэйл эсвэл утасны дугаар
            </label>
            <input
              id="forgotIdentifier"
              type="text"
              value={forgotIdentifier}
              onChange={(e) => setForgotIdentifier(e.target.value)}
              placeholder="admin@mglstore.mn эсвэл 99112233"
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <PrimaryButton loading={isLoading} label="Баталгаажуулах код авах" loadingLabel="Илгээж байна..." />
        </form>
      );
    }

    if (forgotStep === "verifyMn" && verifyMnSession) {
      const isExpired = verifyMnRemainingSeconds <= 0;
      const progress = Math.max(0, Math.min(100, (verifyMnRemainingSeconds / (5 * 60)) * 100));

      return (
        <div className="mt-8 space-y-5">
          <div className="text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Verify.mn баталгаажуулалт</h2>
            <p className="mt-2 text-sm text-slate-500">
              Доорх кодтой SMS-г заасан дугаар руу илгээгээд шалгана уу.
            </p>
          </div>

          {error && <ErrorMessage message={error} />}

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-600">Verify.mn</span>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${isExpired ? "bg-red-100 text-red-700" : "bg-white text-emerald-700"}`}>
                {isExpired ? "Дууссан" : verifyMnTimeText}
              </span>
            </div>
            <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white">
              <div className={`h-full ${isExpired ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${progress}%` }} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Илгээх дугаар</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{verifyMnSession.shortcode}</p>
              </div>
              <div className="rounded-xl bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">SMS текст</p>
                  <button
                    type="button"
                    onClick={handleCopySmsText}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? "OK" : "Хуулах"}
                  </button>
                </div>
                <p className="rounded-lg bg-slate-50 px-2 py-2 text-center text-xl font-black tracking-wide text-slate-950">
                  {verifyMnSession.text}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {isExpired ? (
              <button
                type="button"
                onClick={(event) => void handleForgotSendCode(event as unknown as FormEvent)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Дахин авах
              </button>
            ) : (
              <a
                href={verifyMnSession.smsUri}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
              >
                <MessageSquareText className="h-4 w-4" />
                SMS илгээх
              </a>
            )}
            <button
              type="button"
              onClick={handleVerifyMnComplete}
              disabled={isLoading || isExpired}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {isLoading ? "Шалгаж байна..." : "Шалгах"}
            </button>
          </div>
        </div>
      );
    }

    if (forgotStep === "emailOtp") {
      return (
        <form className="mt-8 space-y-6" onSubmit={handleEmailOtpSubmit}>
          <div className="text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Имэйл OTP</h2>
            <p className="mt-2 text-sm text-slate-500">
              {emailOtpChallenge?.emailMasked || forgotIdentifier} хаяг руу илгээсэн 6 оронтой кодыг оруулна уу.
            </p>
          </div>

          {error && <ErrorMessage message={error} />}

          <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            Код хүчинтэй хугацаа: <span className="font-bold">{emailOtpTimeText}</span>
          </div>

          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={emailOtpCode}
            onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            disabled={isLoading}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-lg font-bold tracking-[0.35em] text-slate-900 transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />

          <PrimaryButton
            loading={isLoading}
            disabled={emailOtpRemainingSeconds <= 0}
            label="Код баталгаажуулах"
            loadingLabel="Шалгаж байна..."
          />
        </form>
      );
    }

    if (forgotStep === "newPassword") {
      return (
        <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
          <div className="text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
              <KeyRound className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Шинэ нууц үг</h2>
            <p className="mt-2 text-sm text-slate-500">Admin account-ийн шинэ нууц үгээ тохируулна уу.</p>
          </div>

          {error && <ErrorMessage message={error} />}

          <div>
            <label htmlFor="newPassword" className="mb-1 block text-sm font-medium text-slate-700">
              Шинэ нууц үг
            </label>
            {renderPasswordInput("newPassword", newPassword, setNewPassword, showNewPassword, setShowNewPassword)}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-slate-700">
              Нууц үг давтах
            </label>
            {renderPasswordInput("confirmPassword", confirmPassword, setConfirmPassword, showConfirmPassword, setShowConfirmPassword)}
          </div>

          <PrimaryButton loading={isLoading} label="Нууц үг шинэчлэх" loadingLabel="Шинэчилж байна..." />
        </form>
      );
    }

    return (
      <div className="mt-8 space-y-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
          <Check className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Нууц үг шинэчлэгдлээ</h2>
          <p className="mt-2 text-sm text-slate-500">Шинэ нууц үгээрээ admin panel-д нэвтэрнэ үү.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForgotState();
            setShowForgot(false);
          }}
          className="flex w-full justify-center rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-white transition-all hover:bg-slate-800"
        >
          Нэвтрэх рүү буцах
        </button>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="relative hidden overflow-hidden bg-slate-900 p-16 text-white lg:flex lg:w-1/2 lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 opacity-10">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full fill-current text-indigo-500">
            <polygon points="0,100 100,0 100,100" />
          </svg>
        </div>

        <div className="relative z-10">
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight">
            MGL<span className="text-indigo-500">ADMIN</span>
          </h1>
          <p className="max-w-md text-lg text-slate-400">
            Системийн удирдлага, байгууллагын хүсэлт, хэрэглэгчийн хяналт болон үндсэн үйл ажиллагааг нэг цэгээс удирдана.
          </p>
        </div>

        <div className="relative z-10 space-y-6">
          {[
            ["Хяналтын төв", "Admin dashboard руу аюулгүй нэвтрэх"],
            ["Удирдлагын боломж", "Хүсэлт, хэрэглэгч, системийн урсгал"],
          ].map(([label, text]) => (
            <div key={label} className="flex items-center space-x-4 rounded-xl border border-slate-700 bg-slate-800/50 p-4 backdrop-blur-sm">
              <div className="rounded-lg bg-indigo-500/20 p-3 text-indigo-500">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-400">{label}</p>
                <p className="text-xl font-bold">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex w-full items-center justify-center p-8 sm:p-12 lg:w-1/2">
        <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-10 shadow-xl">
          {showForgot && (
            <button
              type="button"
              onClick={backFromForgot}
              className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              {forgotStep === "identifier" || forgotStep === "done" ? "Нэвтрэх рүү буцах" : "Буцах"}
            </button>
          )}

          {showForgot ? (
            renderForgotContent()
          ) : (
            <>
              <div className="text-center">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Админ нэвтрэх</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Зөвхөн зөвшөөрөгдсөн admin хэрэглэгч системд нэвтрэх боломжтой.
                </p>
              </div>

              <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                {error && <ErrorMessage message={error} />}

                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                      Имэйл хаяг
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@mglstore.mn"
                      disabled={isLoading}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                        Нууц үг
                      </label>
                      <button
                        type="button"
                        onClick={openForgot}
                        className="text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-500"
                      >
                        Нууц үгээ мартсан?
                      </button>
                    </div>
                    {renderPasswordInput("password", password, setPassword, showPassword, setShowPassword)}
                  </div>
                </div>

                <PrimaryButton loading={isLoading} label="Нэвтрэх" loadingLabel="Шалгаж байна..." />
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                MGL Store системийн дотоод удирдлагын хэсэг
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-600">
      {message}
    </div>
  );
}

function PrimaryButton({
  loading,
  disabled,
  label,
  loadingLabel,
}: {
  loading: boolean;
  disabled?: boolean;
  label: string;
  loadingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-slate-900 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading && <Loader2 className="h-5 w-5 animate-spin" />}
      {loading ? loadingLabel : label}
    </button>
  );
}
