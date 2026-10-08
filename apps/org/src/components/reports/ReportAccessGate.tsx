"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole, LogIn } from "lucide-react";
import { verifyOrgUserCredentials } from "@/lib/org-auth";

type ReportAccessGateProps = {
  organizationId: string;
  organizationName?: string | null;
  onUnlock: () => void;
};

export default function ReportAccessGate({
  organizationId,
  organizationName,
  onUnlock,
}: ReportAccessGateProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!identifier.trim() || !password) {
      setError("Login email/утас болон нууц үгээ оруулна уу.");
      return;
    }

    setLoading(true);
    try {
      await verifyOrgUserCredentials(identifier, password, organizationId);
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

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center py-8">
      <section className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
        <div className="bg-slate-950 px-6 py-7 text-center text-white">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-300 text-slate-950">
            <LockKeyhole className="h-7 w-7" />
          </span>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
            Хамгаалалттай тайлан
          </p>
          <h1 className="mt-2 text-2xl font-black">Дахин нэвтэрнэ үү</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-400">
            {organizationName || "Байгууллага"}-ийн тайланг харахын тулд
            ажилтны нэвтрэх эрхийг баталгаажуулна.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
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
            {loading ? "Эрх шалгаж байна..." : "Тайлан руу нэвтрэх"}
          </button>

          <p className="text-center text-xs font-semibold leading-5 text-slate-400">
            Тайлангийн хуудас бүрэн хаагдсаны дараа дахин нэвтрэх шаардлагатай.
          </p>
        </form>
      </section>
    </div>
  );
}
