"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { loginOrgUser } from "@/lib/org-auth";

export default function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!identifier.trim() || !password) {
      setError("Login email/утас болон нууц үгээ оруулна уу.");
      return;
    }

    setLoading(true);
    try {
      await loginOrgUser(identifier, password);
      router.replace("/dashboard");
      router.refresh();
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Login мэдээлэл буруу байна.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700">
          {error}
        </div>
      )}

      <label className="block">
        <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
          Login email эсвэл утас
        </span>
        <input
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          disabled={loading}
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
          placeholder="owner@company.mn эсвэл 9911xxxx"
        />
      </label>

      <label className="block">
        <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
          Нууц үг
        </span>
        <div className="relative mt-1.5">
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={loading}
            type={showPassword ? "text" : "password"}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm font-bold text-slate-950 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Нууц үг харах"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </label>

      <button
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        {loading ? "Нэвтэрч байна..." : "Нэвтрэх"}
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}
