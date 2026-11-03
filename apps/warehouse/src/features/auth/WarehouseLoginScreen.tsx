"use client";

import { useState } from "react";
import { Warehouse, Loader2, Eye, EyeOff } from "lucide-react";
import { useSignIn } from "./useSignIn";

export function WarehouseLoginScreen({
  investor = false,
}: {
  investor?: boolean;
}) {
  const {
    email,
    setEmail,
    password,
    setPassword,
    error,
    loading,
    handleLogin,
  } = useSignIn(investor ? "/investor" : "/dashboard");
  const [showPw, setShowPw] = useState(false);
  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden w-[480px] flex-col justify-between bg-[#0f172a] p-10 lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
              <Warehouse className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">
              {investor ? "Дундын дэлгүүр" : "MGL WMS"}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {investor
              ? "Хөрөнгө оруулагчийн хуудас"
              : "Warehouse Management System"}
          </p>
        </div>

        <div>
          <h2 className="text-3xl font-black leading-tight text-white">
            {investor ? "Хөрөнгө оруулалтаа" : "Агуулахын үйл ажиллагааг"}
            <br />
            <span className="text-blue-400">нэг дороос хянах</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            {investor
              ? "Өөрийн хөрөнгө оруулалт, дэлгүүрийн бараа, борлуулалт болон ашгийн тайлангаа хараарай."
              : "Нөөцийн бүртгэл, хөдөлгөөн, тооллого зэрэг агуулахын үйл ажиллагааг нэг дороос удирдана."}
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
            <span className="text-xl font-bold text-slate-900">
              {investor ? "Дундын дэлгүүр" : "MGL WMS"}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-black text-slate-900">Нэвтрэх</h1>
            <p className="mt-1 text-sm text-slate-500">
              {investor
                ? "Өөрийн бүртгэлтэй утас эсвэл имэйлээр нэвтэрнэ үү."
                : "Агуулахын системд нэвтрэхийн тулд мэдээллээ оруулна уу."}
            </p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="wms-login-identifier"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Имэйл эсвэл утасны дугаар
                </label>
                <input
                  id="wms-login-identifier"
                  type="text"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Имэйл эсвэл 8 оронтой дугаар"
                  required
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="wms-login-password"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Нууц үг
                </label>
                <div className="relative">
                  <input
                    id="wms-login-password"
                    autoComplete="current-password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 pr-10 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    aria-label={
                      showPw ? "Нууц үгийг нуух" : "Нууц үгийг харуулах"
                    }
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
                  "Нэвтрэх"
                )}
              </button>
            </form>
          </div>

          <p className="mt-4 text-center text-xs text-slate-400">
            <a
              href="/forgot-password"
              className="text-blue-500 hover:text-blue-600 hover:underline"
            >
              Нууц үгээ мартсан уу?
            </a>
            <span className="mx-1.5">·</span>
            Хандах эрхгүй бол админтай холбогдоно уу.
          </p>
        </div>
      </div>
    </div>
  );
}
