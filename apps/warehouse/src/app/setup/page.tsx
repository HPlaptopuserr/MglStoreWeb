"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API } from "@/lib/api";

function SetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "valid" | "error" | "success">("loading");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [warehouseName, setWarehouseName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Token олдсонгүй. Линк буруу байна.");
      return;
    }

    const validateToken = async () => {
      try {
        const res = await fetch(`${API}/warehouse-setup/validate?token=${token}`);
        const data = await res.json();

        if (!res.ok || !data.valid) {
          setStatus("error");
          setError(data.error || "Token буруу эсвэл хугацаа дууссан байна");
          return;
        }

        setEmail(data.email || "");
        setOperatorId(data.operatorId || "");
        setWarehouseName(data.warehouseName || "");
        setStatus("valid");
      } catch {
        setStatus("error");
        setError("Серверт холбогдож чадсангүй");
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      setError("Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой");
      return;
    }

    if (password !== confirmPassword) {
      setError("Нууц үг таарахгүй байна");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${API}/warehouse-setup/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Алдаа гарлаа");
        setIsSubmitting(false);
        return;
      }

      setStatus("success");
    } catch {
      setError("Серверт холбогдож чадсангүй");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo / Branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0f172a]">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">WMS Нууц үг тохируулах</h1>
          <p className="mt-1 text-sm text-slate-500">Агуулахын удирдлагын систем</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {/* Loading */}
          {status === "loading" && (
            <div className="flex flex-col items-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#0f172a]" />
              <p className="mt-4 text-sm text-slate-500">Token шалгаж байна...</p>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="text-center py-8">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Алдаа</h2>
              <p className="mt-2 text-sm text-red-600">{error}</p>
              <p className="mt-4 text-xs text-slate-400">
                Линк хугацаа дууссан бол админаас шинэ линк авна уу.
              </p>
            </div>
          )}

          {/* Valid — Password Form */}
          {status === "valid" && (
            <>
              <div className="mb-6 rounded-xl bg-slate-50 p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Имэйл:</span>
                    <span className="font-medium text-slate-900">{email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Оператор ID:</span>
                    <span className="font-mono font-bold text-[#0f172a]">{operatorId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Агуулах:</span>
                    <span className="font-medium text-slate-900">{warehouseName}</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Нууц үг
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Хамгийн багадаа 8 тэмдэгт"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#0f172a]/20"
                    required
                    minLength={8}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Нууц үг давтах
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Нууц үг дахин оруулна уу"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#0f172a]/20"
                    required
                    minLength={8}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !password || !confirmPassword}
                  className="w-full rounded-xl bg-[#0f172a] py-3 text-sm font-bold text-white transition-all hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Хадгалж байна...
                    </span>
                  ) : (
                    "Нууц үг тохируулах"
                  )}
                </button>
              </form>

              <p className="mt-4 text-center text-xs text-amber-600">
                ⚠ Энэ линк 5 минутын хугацаатай. Хугацаа дуусвал админаас шинэ линк авна уу.
              </p>
            </>
          )}

          {/* Success */}
          {status === "success" && (
            <div className="text-center py-8">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Амжилттай!</h2>
              <p className="mt-2 text-sm text-slate-500">
                Нууц үг амжилттай тохируулагдлаа. Одоо нэвтэрч орно уу.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="mt-6 rounded-xl bg-[#0f172a] px-8 py-3 text-sm font-bold text-white transition-all hover:bg-[#1e293b]"
              >
                Нэвтрэх
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#0f172a]" />
        </div>
      }
    >
      <SetupForm />
    </Suspense>
  );
}
