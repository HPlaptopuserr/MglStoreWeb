"use client";

import Link from "next/link";
import { useOrg } from "@/components/org/OrgContext";
import { canSkipSectionPin } from "@/lib/section-access";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogIn,
} from "lucide-react";
import { verifyOrgUserCredentials } from "@/lib/org-auth";
import {
  getAccessPinStatus,
  verifyAccessPin,
  type ProtectedSectionScope,
} from "@/lib/protected-section-pin";

const PRIVILEGED_ORG_ROLES = ["OWNER", "ADMIN"] as const;

type ProtectedSectionGateProps = {
  organizationId: string;
  organizationName?: string | null;
  userId: string;
  scope: ProtectedSectionScope;
  allowedOrgRoles?: readonly string[];
  eyebrow: string;
  title?: string;
  description: string;
  submitLabel: string;
  footer: string;
  accessDeniedMessage?: string;
  onUnlock: () => void;
};

type PinState = "loading" | "configured" | "missing" | "unavailable";

const onlyDigits = (value: string) => value.replace(/\D/g, "").slice(0, 4);

export default function ProtectedSectionGate({
  organizationId,
  organizationName,
  userId,
  scope,
  allowedOrgRoles = PRIVILEGED_ORG_ROLES,
  eyebrow,
  title = "Хамгаалалттай хэсэг",
  description,
  submitLabel,
  footer,
  accessDeniedMessage,
  onUnlock,
}: ProtectedSectionGateProps) {
  const { user } = useOrg();
  const ownerAccess = canSkipSectionPin(user, organizationId, userId);

  useEffect(() => {
    if (ownerAccess) onUnlock();
  }, [ownerAccess, onUnlock]);

  const pinInputRef = useRef<HTMLInputElement>(null);
  const pinVerificationInFlight = useRef(false);
  const [pinState, setPinState] = useState<PinState>("loading");
  const [pin, setPin] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (ownerAccess) return;
    let active = true;
    setPinState("loading");
    setError("");

    getAccessPinStatus(organizationId)
      .then((status) => {
        if (active) {
          setPinState(status.configured ? "configured" : "missing");
        }
      })
      .catch(() => {
        if (active) setPinState("unavailable");
      });

    return () => {
      active = false;
    };
  }, [organizationId, ownerAccess]);

  useEffect(() => {
    if (pinState === "configured") pinInputRef.current?.focus();
  }, [pinState]);

  const verifyPin = async (nextPin: string) => {
    if (pinVerificationInFlight.current) return;
    setError("");

    if (!/^\d{4}$/.test(nextPin)) {
      setError("4 оронтой PIN кодоо оруулна уу.");
      return;
    }

    pinVerificationInFlight.current = true;
    setLoading(true);
    try {
      await verifyAccessPin(organizationId, scope, nextPin);
      onUnlock();
    } catch (cause) {
      setPin("");
      setError(
        cause instanceof Error ? cause.message : "PIN код буруу байна.",
      );
      window.setTimeout(() => pinInputRef.current?.focus(), 0);
    } finally {
      pinVerificationInFlight.current = false;
      setLoading(false);
    }
  };

  const handlePinChange = (value: string) => {
    const nextPin = onlyDigits(value);
    setPin(nextPin);
    setError("");
    if (nextPin.length === 4) void verifyPin(nextPin);
  };

  const handlePinSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pin.length === 4) void verifyPin(pin);
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!identifier.trim() || !password) {
      setError("Login email/утас болон нууц үгээ оруулна уу.");
      return;
    }

    setLoading(true);
    try {
      await verifyOrgUserCredentials(identifier, password, organizationId, {
        requiredUserId: userId,
        allowedOrgRoles,
        accessDeniedMessage,
      });
      onUnlock();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Нэвтрэх мэдээлэл буруу байна.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (ownerAccess) return null;

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center py-8">
      <section className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
        <div className="bg-slate-950 px-6 py-7 text-center text-white">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-300 text-slate-950">
            {pinState === "configured" ? (
              <KeyRound className="h-7 w-7" />
            ) : (
              <LockKeyhole className="h-7 w-7" />
            )}
          </span>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-2xl font-black">
            {pinState === "configured" || pinState === "loading"
              ? title
              : "Нэвтрэх эрхээ баталгаажуулна уу"}
          </h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
            {pinState === "configured" || pinState === "loading" ? (
              <>
                {organizationName || "Байгууллага"}-ийн {description}
              </>
            ) : (
              <>
                {organizationName || "Байгууллага"}-ийн хамгаалалттай хэсэгт
                нэвтрэхийн тулд өөрийн login мэдээллийг баталгаажуулна.
              </>
            )}
          </p>
        </div>

        {pinState === "loading" ? (
          <div className="flex min-h-48 items-center justify-center gap-2 p-6 text-sm font-bold text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            PIN тохиргоо шалгаж байна...
          </div>
        ) : pinState === "configured" ? (
          <form onSubmit={handlePinSubmit} className="space-y-4 p-6">
            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold leading-5 text-rose-700">
                {error}
              </div>
            ) : null}

            <label className="block">
              <span className="block text-center text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                4 оронтой PIN код
              </span>
              <input
                ref={pinInputRef}
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{4}"
                maxLength={4}
                value={pin}
                onChange={(event) => handlePinChange(event.target.value)}
                disabled={loading}
                aria-label="4 оронтой PIN код"
                placeholder="••••"
                className="mt-3 h-16 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 text-center text-3xl font-black tracking-[0.7em] text-slate-950 outline-none transition placeholder:tracking-[0.7em] focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
              />
            </label>

            <div className="flex min-h-6 items-center justify-center gap-2 text-center text-xs font-bold text-slate-500">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  PIN шалгаж байна...
                </>
              ) : (
                "4 оронг бүрэн оруулахад автоматаар нэвтэрнэ."
              )}
            </div>

            <p className="text-center text-xs font-semibold leading-5 text-slate-400">
              {footer}
            </p>
          </form>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="space-y-4 p-6">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-5 text-amber-900">
              4 оронтой PIN тохируулаагүй байна. Owner нь{" "}
              <Link
                href="/dashboard/settings"
                className="underline decoration-2 underline-offset-2"
              >
                Тохиргоо
              </Link>{" "}
              хэсгээс нэг удаа үүсгэнэ.
            </div>

            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold leading-5 text-rose-700">
                {error}
              </div>
            ) : null}

            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                Login email эсвэл утас
              </span>
              <input
                autoFocus
                autoComplete="username"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                disabled={loading}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                placeholder="owner@company.mn эсвэл 9911xxxx"
              />
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                Нууц үг
              </span>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm font-bold text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label={showPassword ? "Нууц үг нуух" : "Нууц үг харах"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {loading ? "Эрх шалгаж байна..." : submitLabel}
            </button>

            <p className="text-center text-xs font-semibold leading-5 text-slate-400">
              {footer}
            </p>
          </form>
        )}
      </section>
    </div>
  );
}
