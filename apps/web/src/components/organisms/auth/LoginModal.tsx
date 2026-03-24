"use client";

import React, { useState } from "react";
import { User, Loader2, Mail, Phone, Lock, Eye, EyeOff } from "lucide-react";

type AuthTab = "login" | "register";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onLogin: (identifier: string, password: string) => Promise<void>;
  onRegister: (fullName: string, identifier: string, password: string) => Promise<void>;
  isLoading: boolean;
  error: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  open,
  onClose,
  onLogin,
  onRegister,
  isLoading,
  error,
}) => {
  const [tab, setTab] = useState<AuthTab>("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [localError, setLocalError] = useState("");

  if (!open) return null;

  const handleTabChange = (newTab: AuthTab) => {
    setTab(newTab);
    setLocalError("");
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
