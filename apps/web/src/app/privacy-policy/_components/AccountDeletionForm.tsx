"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldAlert,
  Trash2,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { API_BASE } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export function AccountDeletionForm() {
  const { user, logout, authFetch } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [step, setStep] = useState<"input" | "otp" | "confirm-auth" | "success">("input");
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [emailMasked, setEmailMasked] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // ── 1. Request OTP for unauthenticated deletion ────────────────────────────
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setDevCode(null);

    const trimmed = identifier.trim();
    if (!trimmed) {
      setError("И-мэйл хаяг эсвэл утасны дугаараа оруулна уу.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/account-deletion/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Хүсэлт илгээхэд алдаа гарлаа");
      }

      if (data.channel === "emailOtp") {
        setChallengeToken(data.challengeToken || "");
        setEmailMasked(data.emailMasked || trimmed);
        if (data.devCode) setDevCode(data.devCode);
        setStep("otp");
      } else if (data.channel === "verifyMn" && data.session) {
        setError("Утасны баталгаажуулалтын систем рүү холбогдож байна...");
      } else {
        setStep("otp");
      }
    } catch (err: any) {
      setError(err.message || "Алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setLoading(false);
    }
  };

  // ── 2. Confirm OTP and delete ──────────────────────────────────────────────
  const handleConfirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!otpCode.trim()) {
      setError("6 оронтой баталгаажуулах кодоо оруулна уу.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/account-deletion/confirm-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeToken,
          otpCode: otpCode.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Баталгаажуулалт амжилтгүй боллоо");
      }

      setSuccessMessage(
        data.message || "Таны бүртгэл болон хувийн мэдээлэл системээс бүрмөсөн устгагдлаа."
      );
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Алдаа гарлаа. Баталгаажуулах кодоо шалгана уу.");
    } finally {
      setLoading(false);
    }
  };

  // ── 3. Authenticated Direct Delete ─────────────────────────────────────────
  const handleAuthenticatedDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await authFetch(`${API_BASE}/api/auth/account`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() || undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Бүртгэл устгахад алдаа гарлаа");
      }

      logout();
      setSuccessMessage(
        data.message || "Таны бүртгэл болон хувийн мэдээлэл системээс бүрмөсөн устгагдлаа."
      );
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Нууц үг буруу эсвэл алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600 ring-8 ring-red-50">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-950 sm:text-xl">
            Бүртгэл болон хувийн мэдээлэл устгах
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Энэхүү үйлдлийг хийснээр таны хувийн мэдээлэл, хаяг, session болон хандах эрхүүд
            системээс бүрмөсөн устгагдах бөгөөд сэргээх боломжгүй.
          </p>
        </div>
      </div>

      {/* Logged in shortcut indicator */}
      {user && step !== "success" && step !== "confirm-auth" && (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <UserX className="h-5 w-5 text-amber-700" />
            <div>
              <p className="text-sm font-bold text-amber-900">
                Та одоогоор нэвтэрсэн байна ({user.email || user.phone || user.fullName})
              </p>
              <p className="text-xs text-amber-700">
                Та профайлын тохиргооноос эсвэл шууд эндээс бүртгэлээ устгах боломжтой.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStep("confirm-auth")}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Шууд устгах
          </button>
        </div>
      )}

      {/* ── STEP 1: Input Identifier Form ──────────────────────────────────── */}
      {step === "input" && (
        <form onSubmit={handleRequestOtp} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Бүртгэлтэй и-мэйл эсвэл утасны дугаар
            </label>
            <div className="relative mt-2">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="И-мэйл хаяг эсвэл 8 оронтой утасны дугаар"
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-100"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Шалгаж байна...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Баталгаажуулах код авах
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ── STEP 2: Enter OTP Code ─────────────────────────────────────────── */}
      {step === "otp" && (
        <form onSubmit={handleConfirmOtp} className="mt-6 space-y-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <p className="text-xs font-semibold text-blue-900">
              Баталгаажуулах 6 оронтой кодыг <strong>{emailMasked}</strong> хаяг руу илгээлээ.
            </p>
            {devCode && (
              <p className="mt-1 text-xs font-mono text-blue-700">
                [Dev Code: {devCode}]
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              6 оронтой баталгаажуулах код
            </label>
            <div className="relative mt-2">
              <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                required
                autoFocus
                className="w-full tracking-widest rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-base font-bold text-slate-900 outline-none transition focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-100"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Устгаж байна...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Бүртгэл бүрмөсөн устгах
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("input");
                setOtpCode("");
                setError("");
              }}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-5 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
            >
              Буцах
            </button>
          </div>
        </form>
      )}

      {/* ── STEP: Authenticated User Confirmation ────────────────────────── */}
      {step === "confirm-auth" && (
        <form onSubmit={handleAuthenticatedDelete} className="mt-6 space-y-4">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-950">
              Та <strong>{user?.email || user?.phone || user?.fullName}</strong> бүртгэлийг устгах гэж байна.
            </p>
            <p className="mt-1 text-xs text-red-800">
              Устгасны дараа таны профайл, идэвхтэй сессүүд салгагдаж шууд гарах болно.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Нууц үгээ оруулан баталгаажуулна уу (хэрэв нууц үгтэй бол)
            </label>
            <div className="relative mt-2">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Нууц үг"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-100"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Устгаж байна...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Тийм, бүртгэл устгах
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("input");
                setPassword("");
                setError("");
              }}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-5 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
            >
              Болих
            </button>
          </div>
        </form>
      )}

      {/* ── STEP 3: Success Screen ─────────────────────────────────────────── */}
      {step === "success" && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-8 ring-emerald-50">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h4 className="mt-4 text-base font-black text-emerald-950">
            Бүртгэл амжилттай устгагдлаа
          </h4>
          <p className="mt-2 text-sm text-emerald-800">{successMessage}</p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
            >
              Нүүр хуудас руу буцах
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
