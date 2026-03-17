"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const url = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

export default function VendorLoginPage() {
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
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Нэвтрэх үед алдаа гарлаа");
      if (data.user.role !== "SUPPLIER")
        throw new Error("Supplier эрхтэй хэрэглэгч биш байна");

      localStorage.setItem("vendor_token", data.accessToken);
      localStorage.setItem("vendor_user", JSON.stringify(data.user));

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
      {/* Left Panel: Branding & Trust Metrics (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white flex-col justify-between p-16 relative overflow-hidden">
        {/* Abstract background shape for premium feel */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="w-full h-full fill-current text-amber-500"
          >
            <polygon points="0,100 100,0 100,100" />
          </svg>
        </div>

        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold tracking-tight mb-4">
            MGL<span className="text-amber-500">STORE</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-md">
            Үндэсний үйлдвэрлэгч, нийлүүлэгчдийн нэгдсэн экосистем. Монголдоо
            мөнгөө үлдээх хөдөлгөөнд нэгдээрэй.
          </p>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex items-center space-x-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700 backdrop-blur-sm">
            <div className="bg-amber-500/20 p-3 rounded-lg">
              <svg
                className="w-6 h-6 text-amber-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-400">Сүлжээний өсөлт</p>
              <p className="text-xl font-bold">240+ Харилцагч байгууллага</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-slate-100">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Системд нэвтрэх
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Зөвхөн баталгаажсан нийлүүлэгч нар нэвтрэх боломжтой.
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm font-medium border border-red-100">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium text-slate-700 mb-1"
                  htmlFor="email"
                >
                  Имэйл хаяг
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors bg-slate-50 focus:bg-white text-slate-900"
                  placeholder="vendor@company.mn"
                  disabled={isLoading}
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label
                    className="block text-sm font-medium text-slate-700"
                    htmlFor="password"
                  >
                    Нууц үг
                  </label>
                  <a
                    href="#"
                    className="text-sm text-amber-600 hover:text-amber-500 font-medium transition-colors"
                  >
                    Нууц үгээ мартсан?
                  </a>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors bg-slate-50 focus:bg-white text-slate-900"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <svg
                  className="animate-spin h-5 w-5 text-white"
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
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                "Нэвтрэх"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Байгууллагаар бүртгүүлэх хүсэлтэй бол{" "}
            <a
              href={`${url}/company/partnership#partnership-form`}
              className="font-bold text-slate-900 hover:text-amber-600 transition-colors"
            >
              энд дарна уу
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
