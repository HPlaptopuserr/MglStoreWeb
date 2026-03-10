"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:4000";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!email || !password) {
      setError("Имэйл болон нууц үгээ бүрэн оруулна уу.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const text = await res.text();
      let data: any;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          "Серверээс буруу өгөгдөл ирлээ. API ажиллаж байгаа эсэхийг шалга.",
        );
      }

      if (!res.ok) {
        throw new Error(data?.message || "Нэвтрэх эрх татгалзагдлаа.");
      }

      localStorage.setItem("admin_token", data.accessToken);
      localStorage.setItem("admin_user", JSON.stringify(data.user));

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Нэвтрэх нэр эсвэл нууц үг буруу байна",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left Panel */}
      <div className="relative hidden overflow-hidden bg-slate-900 p-16 text-white lg:flex lg:w-1/2 lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 opacity-10">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="h-full w-full fill-current text-indigo-500"
          >
            <polygon points="0,100 100,0 100,100" />
          </svg>
        </div>

        <div className="relative z-10">
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight">
            MGL<span className="text-indigo-500">ADMIN</span>
          </h1>
          <p className="max-w-md text-lg text-slate-400">
            Системийн удирдлага, байгууллагын хүсэлт, хэрэглэгчийн хяналт болон
            үндсэн үйл ажиллагааг нэг цэгээс удирдана.
          </p>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex items-center space-x-4 rounded-xl border border-slate-700 bg-slate-800/50 p-4 backdrop-blur-sm">
            <div className="rounded-lg bg-indigo-500/20 p-3">
              <svg
                className="h-6 w-6 text-indigo-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m5-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <div>
              <p className="text-sm text-slate-400">Хяналтын төв</p>
              <p className="text-xl font-bold">
                Admin dashboard руу аюулгүй нэвтрэх
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4 rounded-xl border border-slate-700 bg-slate-800/50 p-4 backdrop-blur-sm">
            <div className="rounded-lg bg-indigo-500/20 p-3">
              <svg
                className="h-6 w-6 text-indigo-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 7h18M3 12h18M3 17h18"
                />
              </svg>
            </div>

            <div>
              <p className="text-sm text-slate-400">Удирдлагын боломж</p>
              <p className="text-xl font-bold">
                Хүсэлт, хэрэглэгч, системийн урсгал
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex w-full items-center justify-center p-8 sm:p-12 lg:w-1/2">
        <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-100 bg-white p-10 shadow-xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Админ нэвтрэх
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Зөвхөн зөвшөөрөгдсөн админ хэрэглэгч системд нэвтрэх боломжтой.
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
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
                <div className="mb-1 flex justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Нууц үг
                  </label>
                </div>

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 transition-colors focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full justify-center rounded-xl border border-transparent bg-slate-900 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <svg
                  className="h-5 w-5 animate-spin text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                "Нэвтрэх"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            MGL Store системийн дотоод удирдлагын хэсэг
          </p>
        </div>
      </div>
    </div>
  );
}
