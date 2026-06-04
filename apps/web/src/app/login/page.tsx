"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, UserRound } from "lucide-react";
import { LoginModal } from "@/components/organisms/auth/LoginModal";
import { useAuth } from "@/lib/auth-context";
import { API } from "@/lib/api";
import { AUTH_LOGIN_BANNER_KEY, createLoginMarketingBanner, parseLoginMarketingBanner } from "@/lib/site-banners";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login, register } = useAuth();
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [marketingBanner, setMarketingBanner] = useState(() => createLoginMarketingBanner());

  useEffect(() => {
    if (!loading && user) {
      router.replace("/profile");
    }
  }, [loading, router, user]);

  useEffect(() => {
    fetch(`${API}/site-settings`)
      .then((response) => (response.ok ? response.json() : ({} as Record<string, string>)))
      .then((settings) => setMarketingBanner(parseLoginMarketingBanner(settings?.[AUTH_LOGIN_BANNER_KEY])))
      .catch(() => setMarketingBanner(createLoginMarketingBanner()));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <main className="relative min-h-[calc(100vh-150px)] overflow-hidden bg-slate-50">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,22,0.16),transparent_55%)]" />
      <div className="container relative mx-auto grid min-h-[calc(100vh-150px)] place-items-center px-4 py-10 lg:px-8">
        <section className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-50 text-orange-600">
            <UserRound className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950">Нэвтрэх</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-slate-500">
            Худалдан авалт, захиалга, хадгалсан бараагаа удирдахын тулд MGL Store-д нэвтэрнэ үү.
          </p>
          <button
            type="button"
            onClick={() => setAuthError("")}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-orange-500 px-7 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-slate-950"
          >
            Нэвтрэх / Бүртгүүлэх
          </button>
          <Link
            href="/"
            className="mx-auto mt-4 inline-flex items-center gap-2 text-sm font-black text-slate-400 transition hover:text-orange-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Нүүр рүү буцах
          </Link>
        </section>
      </div>

      <LoginModal
        open
        onClose={() => router.back()}
        onLogin={async (identifier, password, options) => {
          setAuthError("");
          setAuthLoading(true);
          try {
            const result = await login(identifier, password, options);
            if (result?.requiresEmailOtp) return result;
            router.replace("/profile");
          } catch (err: unknown) {
            setAuthError(err instanceof Error ? err.message : "Нэвтрэхэд алдаа гарлаа.");
          } finally {
            setAuthLoading(false);
          }
        }}
        onRegister={async (fullName, identifier, password) => {
          setAuthError("");
          setAuthLoading(true);
          try {
            await register(fullName, identifier, password);
            router.replace("/profile");
          } catch (err: unknown) {
            setAuthError(err instanceof Error ? err.message : "Бүртгүүлэхэд алдаа гарлаа.");
          } finally {
            setAuthLoading(false);
          }
        }}
        isLoading={authLoading}
        error={authError}
        marketingBanner={marketingBanner}
      />
    </main>
  );
}
